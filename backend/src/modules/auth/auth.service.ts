import { Injectable } from '@nestjs/common';
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
    const { email, password, fullName } = signupDto;

    try {
      // Check if user already exists
      const db = this.firebaseService.getFirestore();
      const existingUser = await db.collection('users').where('email', '==', email).get();
      
      if (!existingUser.empty) {
        throw new Error('User with this email already exists');
      }

      // Generate a unique ID for the user
      const userId = uuidv4();

      // Create user document in Firestore with hashed password equivalent
      // For now, we'll store password as-is (NOT recommended for production)
      // In production, use bcryptjs to hash the password
      await db.collection('users').doc(userId).set({
        id: userId,
        email,
        fullName,
        password, // TODO: Hash this with bcryptjs in production
        role: 'employee',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Generate JWT token
      const accessToken = this.jwtService.sign({
        sub: userId,
        email,
        role: 'employee',
      });

      return {
        id: userId,
        email,
        fullName,
        role: 'employee',
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
      // Find user by email
      const db = this.firebaseService.getFirestore();
      const userDoc = await db.collection('users').where('email', '==', email).get();

      if (userDoc.empty) {
        throw new Error('User not found');
      }

      const userData = userDoc.docs[0].data();

      // Verify password (TODO: Use bcryptjs.compare() in production)
      if (userData.password !== password) {
        throw new Error('Invalid password');
      }

      // Generate JWT token
      const accessToken = this.jwtService.sign({
        sub: userData.id,
        email: userData.email,
        role: userData.role,
      });

      return {
        id: userData.id,
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
        accessToken,
        tokenType: 'Bearer',
      };
    } catch (error) {
      throw error;
    }
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
