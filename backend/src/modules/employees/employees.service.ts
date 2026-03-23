import { Injectable } from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeFilterDto } from './dto/employee-filter.dto';

@Injectable()
export class EmployeesService {
  constructor(private firebaseService: FirebaseService) {}

  async create(createEmployeeDto: CreateEmployeeDto, userId: string) {
    const db = this.firebaseService.getFirestore();
    const employeeRef = db.collection('employees').doc();

    const newEmployee = {
      ...createEmployeeDto,
      employmentStatus: createEmployeeDto.employmentStatus || 'Active',
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

    const updatedEmployee = {
      ...updateEmployeeDto,
      updatedBy: userId,
      updatedAt: new Date(),
    };

    await db.collection('employees').doc(id).update(updatedEmployee);

    return {
      id,
      ...updatedEmployee,
    };
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
