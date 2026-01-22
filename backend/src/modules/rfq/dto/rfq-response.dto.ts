import { ApiProperty } from '@nestjs/swagger';

export enum RfqStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  RESPONSES_RECEIVED = 'responses_received',
  EVALUATED = 'evaluated',
  CLOSED = 'closed',
}

export class RfqRecord {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  projectId?: string;

  @ApiProperty()
  rfqName: string;

  @ApiProperty()
  rfqNumber: string;

  @ApiProperty({ type: [String] })
  bomItemIds: string[];

  @ApiProperty({ type: [String] })
  vendorIds: string[];

  @ApiProperty()
  quoteDeadline?: Date;

  @ApiProperty({ enum: ['single', 'multiple', 'competitive'] })
  selectionType: string;

  @ApiProperty()
  buyerName?: string;

  @ApiProperty()
  emailBody?: string;

  @ApiProperty()
  emailSubject?: string;

  @ApiProperty({ enum: RfqStatus })
  status: RfqStatus;

  @ApiProperty()
  sentAt?: Date;

  @ApiProperty()
  closedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class RfqSummary {
  @ApiProperty()
  id: string;

  @ApiProperty()
  rfqName: string;

  @ApiProperty()
  rfqNumber: string;

  @ApiProperty({ enum: RfqStatus })
  status: RfqStatus;

  @ApiProperty()
  itemCount: number;

  @ApiProperty()
  vendorCount: number;

  @ApiProperty()
  responseCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  sentAt?: Date;
}