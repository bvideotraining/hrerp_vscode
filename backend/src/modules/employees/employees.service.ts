import { Injectable, ConflictException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseService } from '@config/firebase/firebase.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeFilterDto } from './dto/employee-filter.dto';

@Injectable()
export class EmployeesService {
  constructor(private firebaseService: FirebaseService) {}

  async create(createEmployeeDto: CreateEmployeeDto, userId: string) {
    const db = this.firebaseService.getFirestore();
    const existing = await db.collection('employees').where('employeeCode', '==', createEmployeeDto.employeeCode).limit(1).get();
    if (!existing.empty) throw new ConflictException(`Employee code '${createEmployeeDto.employeeCode}' already exists`);
    const employeeRef = db.collection('employees').doc();

    // Convert class instance → plain JS object (strips class-transformer metadata)
    const plainDto = JSON.parse(JSON.stringify(createEmployeeDto));

    // Sanitize documents: ensure every document is a flat map of primitive/string values
    if (Array.isArray(plainDto.documents)) {
      plainDto.documents = plainDto.documents.map((doc: any) => {
        const clean: Record<string, any> = {};
        for (const [k, v] of Object.entries(doc)) {
          if (!Array.isArray(v)) clean[k] = v;
        }
        return clean;
      });
    }

    const newEmployee = {
      ...plainDto,
      employmentStatus: plainDto.employmentStatus || 'Active',
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await employeeRef.set(newEmployee);

    return {
      id: employeeRef.id,
      ...newEmployee,
    };
  }

  async findAll(filters?: EmployeeFilterDto) {
    const db = this.firebaseService.getFirestore();
    let query: any = db.collection('employees');

    // Apply filters
    if (filters?.branch) {
      query = query.where('branch', '==', filters.branch);
    }
    if (filters?.department) {
      query = query.where('department', '==', filters.department);
    }
    if (filters?.employmentStatus) {
      query = query.where('employmentStatus', '==', filters.employmentStatus);
    }

    // Apply sorting
    if (filters?.sortBy) {
      query = query.orderBy(filters.sortBy, filters.sortOrder || 'asc');
    } else {
      query = query.orderBy('createdAt', 'desc');
    }

    // Apply pagination
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async findById(id: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('employees').doc(id).get();

    if (!doc.exists) {
      throw new Error(`Employee with ID ${id} not found`);
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto, userId: string) {
    const db = this.firebaseService.getFirestore();

    if (updateEmployeeDto.employeeCode) {
      const existing = await db.collection('employees').where('employeeCode', '==', updateEmployeeDto.employeeCode).limit(1).get();
      if (!existing.empty && existing.docs[0].id !== id) throw new ConflictException(`Employee code '${updateEmployeeDto.employeeCode}' already exists`);
    }

    // Convert class instance → plain JS object (strips class-transformer metadata / prototype chain)
    const plainDto = JSON.parse(JSON.stringify(updateEmployeeDto));

    console.log('[employees.service] update - documents received:', JSON.stringify(plainDto.documents));

    // Sanitize documents: ensure every document is a flat map of primitive/string values
    if (Array.isArray(plainDto.documents)) {
      plainDto.documents = plainDto.documents.map((doc: any) => {
        const clean: Record<string, any> = {};
        for (const [k, v] of Object.entries(doc)) {
          // Firestore disallows nested arrays; skip array-valued fields
          if (!Array.isArray(v)) clean[k] = v;
        }
        return clean;
      });
    }

    console.log('[employees.service] update - documents to write:', JSON.stringify((plainDto.documents || []).map((d: any) => ({ type: d.type, receivedDate: d.receivedDate, hasFile: !!d.fileContent }))));


    const updatedEmployee = {
      ...plainDto,
      updatedBy: userId,
      updatedAt: new Date(),
    };

    // Use set({ merge: true }) instead of update() — more reliable with array fields in Firestore
    await db.collection('employees').doc(id).set(updatedEmployee, { merge: true });

    return {
      id,
      ...updatedEmployee,
    };
  }

  async uploadPhoto(file: Express.Multer.File) {
    if (!file) throw new Error('No file provided');
    const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'jpg';
    const storagePath = `profile-photos/${uuidv4()}.${ext}`;
    const url = await this.firebaseService.uploadToStorage(file.buffer, file.mimetype, storagePath);
    console.log('[employees.service] uploadPhoto - uploaded to', url);
    return { url, originalName: file.originalname };
  }

  async uploadDocument(employeeId: string, file: Express.Multer.File) {
    if (!file) throw new Error('No file provided');
    const url = await this.firebaseService.uploadFile(
      file.buffer,
      file.mimetype,
      employeeId,
      file.originalname,
    );
    console.log('[employees.service] uploadDocument - uploaded to', url);
    return { url, originalName: file.originalname, mimeType: file.mimetype };
  }

  async updateDocuments(id: string, documents: any[], userId: string) {
    const db = this.firebaseService.getFirestore();

    const empDoc = await db.collection('employees').doc(id).get();
    if (!empDoc.exists) throw new Error(`Employee with ID ${id} not found`);

    // Clean each document: strip undefined and nested arrays (Firestore rejects both)
    const cleanDocuments = documents.map((doc: any) => {
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(doc)) {
        if (v !== undefined && v !== null && !Array.isArray(v)) {
          clean[k] = v;
        }
      }
      return clean;
    });

    console.log('[employees.service] updateDocuments - writing', cleanDocuments.length, 'documents for employee', id);

    await db.collection('employees').doc(id).set(
      { documents: cleanDocuments, updatedBy: userId, updatedAt: new Date() },
      { merge: true }
    );

    return { id, documents: cleanDocuments };
  }

  async delete(id: string) {
    const db = this.firebaseService.getFirestore();

    const doc = await db.collection('employees').doc(id).get();
    if (!doc.exists) {
      throw new Error(`Employee with ID ${id} not found`);
    }

    await db.collection('employees').doc(id).delete();

    return {
      id,
      message: 'Employee deleted successfully',
    };
  }

  async search(searchTerm: string) {
    const db = this.firebaseService.getFirestore();

    const snapshot = await db.collection('employees').get();
    const results = snapshot.docs
      .map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter(
        (emp: any) =>
          emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    return results;
  }

  async getByDepartment(department: string) {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('employees')
      .where('department', '==', department)
      .orderBy('fullName', 'asc')
      .get();

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async getByBranch(branch: string) {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('employees')
      .where('branch', '==', branch)
      .orderBy('fullName', 'asc')
      .get();

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async getActiveCount() {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('employees')
      .where('employmentStatus', '==', 'Active')
      .get();

    return {
      count: snapshot.size,
    };
  }

  async batchCreate(employees: CreateEmployeeDto[], userId: string) {
    const db = this.firebaseService.getFirestore();
    const batch = db.batch();

    const createdEmployees: any[] = [];
    employees.forEach((emp) => {
      const ref = db.collection('employees').doc();
      batch.set(ref, {
        ...emp,
        id: ref.id,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      createdEmployees.push({
        id: ref.id,
        ...emp,
      });
    });

    await batch.commit();
    return {
      count: createdEmployees.length,
      employees: createdEmployees,
    };
  }
}
