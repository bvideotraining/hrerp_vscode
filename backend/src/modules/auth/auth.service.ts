import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirebaseService } from '@config/firebase/firebase.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private firebaseService: FirebaseService,
    private jwtService: JwtService
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, password, fullName, employeeCode, employeeId } = signupDto;

    try {
      const db = this.firebaseService.getFirestore();

      // Check if user already exists by email
      const existingUser = await db.collection('users').where('email', '==', email).get();
      if (!existingUser.empty) {
        throw new ConflictException('User with this email already exists');
      }

      // If an employeeCode is provided, validate it is not already linked to another account
      if (employeeCode) {
        const [byCodeUsers, byCodeSys] = await Promise.all([
          db.collection('users').where('employeeCode', '==', employeeCode).limit(1).get(),
          db.collection('systemUsers').where('employeeCode', '==', employeeCode).limit(1).get(),
        ]);
        if (!byCodeUsers.empty || !byCodeSys.empty) {
          throw new ConflictException(`An account already exists for employee code '${employeeCode}'`);
        }
      }

      if (employeeId) {
        const [byIdUsers, byIdSys] = await Promise.all([
          db.collection('users').where('employeeId', '==', employeeId).limit(1).get(),
          db.collection('systemUsers').where('employeeId', '==', employeeId).limit(1).get(),
        ]);
        if (!byIdUsers.empty || !byIdSys.empty) {
          throw new ConflictException('An account already exists for this employee');
        }
      }

      const userId = uuidv4();

      await db.collection('users').doc(userId).set({
        id: userId,
        email,
        fullName,
        password,
        employeeCode: employeeCode || '',
        employeeId: employeeId || '',
        role: 'employee',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const accessToken = this.jwtService.sign({
        sub: userId,
        email,
        role: 'employee',
        employeeId: employeeId || '',
        employeeCode: employeeCode || '',
      });

      return {
        id: userId,
        email,
        fullName,
        role: 'employee',
        employeeId: employeeId || '',
        employeeCode: employeeCode || '',
        accessToken,
        tokenType: 'Bearer',
      };
    } catch (error) {
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    try {
      // Find user by email — check both 'users' and 'systemUsers' collections
      // IMPORTANT: systemUsers takes priority — it holds role assignments
      const db = this.firebaseService.getFirestore();
      const [userDoc, systemUserDoc] = await Promise.all([
        db.collection('users').where('email', '==', email).get(),
        db.collection('systemUsers').where('email', '==', email).get(),
      ]);

      // Prefer systemUsers (has roleId + roleName) over generic users
      // But if systemUser has no password field, fall back to users collection for verification
      let doc = !systemUserDoc.empty ? systemUserDoc.docs[0] : !userDoc.empty ? userDoc.docs[0] : null;
      let passwordDoc = doc; // the doc used for password verification

      // When the primary doc is from systemUsers but has no password, use the users
      // collection entry for password verification (same email)
      if (!systemUserDoc.empty && systemUserDoc.docs[0].data().password === undefined && !userDoc.empty) {
        passwordDoc = userDoc.docs[0];
      }

      if (!doc) {
        throw new Error('User not found');
      }

      const userData = doc.data();
      const passwordData = passwordDoc!.data();

      // Verify password (TODO: Use bcryptjs.compare() in production)
      if (passwordData.password !== password) {
        throw new Error('Invalid password');
      }

      // Resolve id — 'users' stores it in data.id, 'systemUsers' uses the doc id
      const resolvedId = userData.id || doc.id;

      // ── Role lookup ────────────────────────────────────────
      let permissions: any[] = [];
      let scopeType: string[] = [];
      let scopeDepartments: string[] = [];
      let scopeBranches: string[] = [];
      let scopeJobTitles: string[] = [];
      let roleId = userData.roleId || userData.role || '';
      let accessType = 'custom'; // safe default; overridden if role is found

      console.log(`[Auth] User doc fields: roleId="${userData.roleId}", roleName="${userData.roleName}", role="${userData.role}"`);

      const rolesRef = db.collection('roles');
      let roleDoc: any = null;

      if (roleId) {
        // 1. Try Firestore doc ID
        const byId = await rolesRef.doc(roleId).get();
        if (byId.exists) {
          roleDoc = byId.data();
          console.log(`[Auth] Role found by doc ID "${roleId}": accessType=${roleDoc.accessType}, permissions=${roleDoc.permissions?.length ?? 0}`);
        } else {
          // 2. Try by name field (handles case where roleId is actually a role name)
          const byName = await rolesRef.where('name', '==', roleId).limit(1).get();
          if (!byName.empty) {
            roleDoc = byName.docs[0].data();
            roleId = byName.docs[0].id;
            console.log(`[Auth] Role found by name "${roleId}": accessType=${roleDoc.accessType}, permissions=${roleDoc.permissions?.length ?? 0}`);
          }
        }
      }

      // 3. Last resort: use the stored roleName field (handles stale/deleted role IDs)
      if (!roleDoc && userData.roleName) {
        const byRoleName = await rolesRef.where('name', '==', userData.roleName).limit(1).get();
        if (!byRoleName.empty) {
          roleDoc = byRoleName.docs[0].data();
          roleId = byRoleName.docs[0].id;
          console.log(`[Auth] Role found by roleName fallback "${userData.roleName}": accessType=${roleDoc.accessType}, permissions=${roleDoc.permissions?.length ?? 0}`);
        }
      }

      if (roleDoc) {
        permissions = roleDoc.permissions || [];
        accessType = roleDoc.accessType || 'custom';
        scopeType = roleDoc.scopeType || [];
        scopeDepartments = roleDoc.scopeDepartments || [];
        scopeBranches = roleDoc.scopeBranches || [];
        scopeJobTitles = roleDoc.scopeJobTitles || [];
      } else {
        console.warn(`[Auth] Role NOT found. roleId="${userData.roleId}", roleName="${userData.roleName}", role="${userData.role}" — no permissions granted`);
      }

      // ── Employee record lookup (to get employeeCode) ───────
      let employeeId = userData.employeeId || '';
      let employeeCode = userData.employeeCode || '';
      if (employeeId && !employeeCode) {
        try {
          const empDoc = await db.collection('employees').doc(employeeId).get();
          if (empDoc.exists) {
            employeeCode = (empDoc.data() as any).employeeCode || '';
            console.log(`[Auth] Employee code for employeeId="${employeeId}": "${employeeCode}"`);
          }
        } catch {
          // non-critical — proceed without code
        }
      }

      // Generate JWT token
      // Derive a stable role string: use userData.role if set, otherwise derive
      // from accessType ('full' → 'admin', 'custom' → 'employee')
      const effectiveRole = userData.role || (accessType === 'full' ? 'admin' : 'employee');
      const accessToken = this.jwtService.sign({
        sub: resolvedId,
        email: userData.email,
        role: effectiveRole,
        accessType,
        employeeId,
        employeeCode,
      });

      return {
        id: resolvedId,
        email: userData.email,
        fullName: userData.fullName || userData.name || '',
        role: effectiveRole,
        roleName: roleDoc?.name || userData.roleName || '',
        roleId,
        accessType,
        permissions,
        scopeType,
        scopeDepartments,
        scopeBranches,
        scopeJobTitles,
        employeeId,
        employeeCode,
        accessToken,
        tokenType: 'Bearer',
      };
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(email: string, newPassword: string) {
    const db = this.firebaseService.getFirestore();
    const [userSnap, sysUserSnap] = await Promise.all([
      db.collection('users').where('email', '==', email).get(),
      db.collection('systemUsers').where('email', '==', email).get(),
    ]);

    // IMPORTANT: same priority as login — systemUsers takes precedence over users
    const doc = !sysUserSnap.empty ? sysUserSnap.docs[0] : !userSnap.empty ? userSnap.docs[0] : null;

    if (!doc) {
      throw new Error('No account found with that email address');
    }

    await doc.ref.update({ password: newPassword, updatedAt: new Date() });
    return { success: true };
  }

  /**
   * Build a full user profile from Firestore for the given user ID.
   * Used by GET /api/auth/me so the frontend always gets fresh data.
   */
  async getProfile(userId: string) {
    const db = this.firebaseService.getFirestore();

    // Look in systemUsers first (has role assignments), then users
    let doc: any = null;
    const sysDoc = await db.collection('systemUsers').doc(userId).get();
    if (sysDoc.exists) {
      doc = sysDoc;
    } else {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) doc = userDoc;
    }

    if (!doc) throw new Error('User not found');
    const userData = doc.data();
    const resolvedId = userData.id || doc.id;

    // ── Role lookup ────────────────────────────────────────
    let permissions: any[] = [];
    let scopeType: string[] = [];
    let scopeDepartments: string[] = [];
    let scopeBranches: string[] = [];
    let scopeJobTitles: string[] = [];
    let roleId = userData.roleId || userData.role || '';
    let accessType = 'custom';
    const rolesRef = db.collection('roles');
    let roleDoc: any = null;

    if (roleId) {
      const byId = await rolesRef.doc(roleId).get();
      if (byId.exists) {
        roleDoc = byId.data();
      } else {
        const byName = await rolesRef.where('name', '==', roleId).limit(1).get();
        if (!byName.empty) { roleDoc = byName.docs[0].data(); roleId = byName.docs[0].id; }
      }
    }
    if (!roleDoc && userData.roleName) {
      const byRoleName = await rolesRef.where('name', '==', userData.roleName).limit(1).get();
      if (!byRoleName.empty) { roleDoc = byRoleName.docs[0].data(); roleId = byRoleName.docs[0].id; }
    }
    if (roleDoc) {
      permissions = roleDoc.permissions || [];
      accessType = roleDoc.accessType || 'custom';
      scopeType = roleDoc.scopeType || [];
      scopeDepartments = roleDoc.scopeDepartments || [];
      scopeBranches = roleDoc.scopeBranches || [];
      scopeJobTitles = roleDoc.scopeJobTitles || [];
    }

    // ── Employee record ────────────────────────────────────
    let employeeId = userData.employeeId || '';
    let employeeCode = userData.employeeCode || '';
    let jobTitle = '';
    if (employeeId) {
      try {
        const empDoc = await db.collection('employees').doc(employeeId).get();
        if (empDoc.exists) {
          const empData = empDoc.data() as any;
          if (!employeeCode) employeeCode = empData.employeeCode || '';
          jobTitle = empData.jobTitle || '';
        }
      } catch { /* non-critical */ }
    }

    // Derive role same way as login: stored role, or derive from accessType
    const effectiveRole = userData.role || (accessType === 'full' ? 'admin' : 'employee');

    return {
      id: resolvedId,
      email: userData.email,
      fullName: userData.fullName || userData.name || '',
      role: effectiveRole,
      roleName: roleDoc?.name || userData.roleName || '',
      roleId,
      accessType,
      permissions,
      scopeType,
      scopeDepartments,
      scopeBranches,
      scopeJobTitles,
      employeeId,
      employeeCode,
      jobTitle,
    };
  }

  /**
   * Exchange a Firebase ID token for a system JWT.
   * Used by the Android mobile attendance app after Firebase Auth sign-in.
   */
  async exchangeFirebaseToken(idToken: string) {
    // 1. Verify with Firebase Admin SDK
    const decoded = await this.firebaseService.verifyIdToken(idToken);
    const firebaseUid = decoded.uid;
    const firebaseEmail = decoded.email || '';

    const db = this.firebaseService.getFirestore();

    // 2. Find matching user — check systemUsers first, then users
    const [sysSnap, usrSnap] = await Promise.all([
      db.collection('systemUsers').where('email', '==', firebaseEmail).limit(1).get(),
      db.collection('users').where('email', '==', firebaseEmail).limit(1).get(),
    ]);
    const doc = !sysSnap.empty ? sysSnap.docs[0] : !usrSnap.empty ? usrSnap.docs[0] : null;
    if (!doc) throw new Error('No HR system account linked to this Firebase user');

    const userData = doc.data();
    const resolvedId = userData.id || doc.id;

    // 3. Role lookup (same logic as login)
    let permissions: any[] = [];
    let scopeType: string[] = [];
    let scopeDepartments: string[] = [];
    let scopeBranches: string[] = [];
    let scopeJobTitles: string[] = [];
    let roleId = userData.roleId || userData.role || '';
    let accessType = 'custom';
    const rolesRef = db.collection('roles');
    let roleDoc: any = null;

    if (roleId) {
      const byId = await rolesRef.doc(roleId).get();
      if (byId.exists) {
        roleDoc = byId.data();
      } else {
        const byName = await rolesRef.where('name', '==', roleId).limit(1).get();
        if (!byName.empty) { roleDoc = byName.docs[0].data(); roleId = byName.docs[0].id; }
      }
    }
    if (!roleDoc && userData.roleName) {
      const byRoleName = await rolesRef.where('name', '==', userData.roleName).limit(1).get();
      if (!byRoleName.empty) { roleDoc = byRoleName.docs[0].data(); roleId = byRoleName.docs[0].id; }
    }
    if (roleDoc) {
      permissions = roleDoc.permissions || [];
      accessType = roleDoc.accessType || 'custom';
      scopeType = roleDoc.scopeType || [];
      scopeDepartments = roleDoc.scopeDepartments || [];
      scopeBranches = roleDoc.scopeBranches || [];
      scopeJobTitles = roleDoc.scopeJobTitles || [];
    }

    // 4. Employee record
    let employeeId = userData.employeeId || '';
    let employeeCode = userData.employeeCode || '';
    if (employeeId && !employeeCode) {
      try {
        const empDoc = await db.collection('employees').doc(employeeId).get();
        if (empDoc.exists) employeeCode = (empDoc.data() as any).employeeCode || '';
      } catch { /* non-critical */ }
    }

    const effectiveRole = userData.role || (accessType === 'full' ? 'admin' : 'employee');
    const accessToken = this.jwtService.sign({
      sub: resolvedId,
      email: userData.email,
      role: effectiveRole,
      accessType,
      employeeId,
      employeeCode,
    });

    return {
      id: resolvedId,
      email: userData.email,
      fullName: userData.fullName || userData.name || '',
      role: effectiveRole,
      roleName: roleDoc?.name || userData.roleName || '',
      roleId,
      accessType,
      permissions,
      scopeType,
      scopeDepartments,
      scopeBranches,
      scopeJobTitles,
      employeeId,
      employeeCode,
      accessToken,
      tokenType: 'Bearer',
    };
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw error;
    }
  }

  async verifyFirebaseToken(idToken: string) {
    try {
      return await this.firebaseService.verifyIdToken(idToken);
    } catch (error) {
      throw error;
    }
  }
}
