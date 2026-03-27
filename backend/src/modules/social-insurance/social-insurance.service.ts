import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseService } from '@config/firebase/firebase.service';
import { CreateSocialInsuranceDto, UpdateSocialInsuranceDto } from './dto/social-insurance.dto';

const EMPLOYEE_SHARE_RATE = 0.1125; // 11.25%
const EMPLOYER_SHARE_RATE = 0.19;   // 19%

function computeShares(insurableWage: number) {
  return {
    employeeShare: Math.round(insurableWage * EMPLOYEE_SHARE_RATE * 100) / 100,
    employerShare: Math.round(insurableWage * EMPLOYER_SHARE_RATE * 100) / 100,
  };
}

@Injectable()
export class SocialInsuranceService {
  constructor(private firebaseService: FirebaseService) {}

  async findAll(scopeEmployeeId?: string) {
    const db = this.firebaseService.getFirestore();
    let query: FirebaseFirestore.Query = db.collection('social_insurance');
    if (scopeEmployeeId) {
      query = query.where('employeeId', '==', scopeEmployeeId);
    }
    const snap = await query.get();
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) =>
        (a.employeeName || '').localeCompare(b.employeeName || ''),
      );
  }

  async findOne(id: string) {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('social_insurance').doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Social insurance policy '${id}' not found`);
    return { id: doc.id, ...doc.data() };
  }

  async create(dto: CreateSocialInsuranceDto) {
    const db = this.firebaseService.getFirestore();
    // One policy per employee — doc ID is the employeeId
    const docId = dto.employeeId;
    const existing = await db.collection('social_insurance').doc(docId).get();
    if (existing.exists) {
      throw new BadRequestException(
        `A social insurance policy already exists for this employee. Use edit to update it.`,
      );
    }
    const shares = computeShares(dto.insurableWage);
    const data = {
      ...dto,
      attachments: dto.attachments || [],
      ...shares,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.collection('social_insurance').doc(docId).set(data);
    return { id: docId, ...data };
  }

  async update(id: string, dto: UpdateSocialInsuranceDto) {
    const db = this.firebaseService.getFirestore();
    const ref = db.collection('social_insurance').doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new NotFoundException(`Social insurance policy '${id}' not found`);
    const current = existing.data() as any;

    // Recompute shares if wage was updated
    const newWage = dto.insurableWage ?? current.insurableWage;
    const shares = computeShares(newWage);

    const updateData = {
      ...dto,
      ...shares,
      updatedAt: new Date().toISOString(),
    };
    await ref.update(updateData);
    return { id, ...current, ...updateData };
  }

  async remove(id: string) {
    const db = this.firebaseService.getFirestore();
    const ref = db.collection('social_insurance').doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new NotFoundException(`Social insurance policy '${id}' not found`);
    await ref.delete();
    return { id };
  }

  /** Upload a standalone attachment file before a policy exists (pre-create flow) */
  async uploadAttachment(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : '';
    const storagePath = `social-insurance/pending/${uuidv4()}${ext ? '.' + ext : ''}`;
    const url = await this.firebaseService.uploadToStorage(file.buffer, file.mimetype, storagePath);
    return { url, name: file.originalname, mimeType: file.mimetype };
  }

  /** Upload an attachment to an existing policy and append it to the policy's attachments[] */
  async uploadPolicyAttachment(
    policyId: string,
    file: Express.Multer.File,
    formType?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const db = this.firebaseService.getFirestore();
    const ref = db.collection('social_insurance').doc(policyId);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException(`Social insurance policy '${policyId}' not found`);
    const existing = doc.data() as any;

    const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : '';
    const storagePath = `social-insurance/${policyId}/${uuidv4()}${ext ? '.' + ext : ''}`;
    const url = await this.firebaseService.uploadToStorage(file.buffer, file.mimetype, storagePath);

    const attachment = {
      name: file.originalname,
      url,
      mimeType: file.mimetype,
      formType: formType || null,
      uploadedAt: new Date().toISOString(),
    };
    const updatedAttachments = [...(existing.attachments || []), attachment];
    await ref.update({ attachments: updatedAttachments, updatedAt: new Date().toISOString() });
    return { id: policyId, attachment, attachments: updatedAttachments };
  }
}
