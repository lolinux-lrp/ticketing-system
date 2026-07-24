import { gmail_v1 } from 'googleapis';

export type GmailMessage = gmail_v1.Schema$Message;
export type GmailMessagePart = gmail_v1.Schema$MessagePart;
export type GmailMessagePartHeader = gmail_v1.Schema$MessagePartHeader;
export type GmailHistory = gmail_v1.Schema$History;

export interface ProcessedTicketResult {
  ticketId: string;
  title: string;
  priority: string;
  projectName: string;
}

export interface EmailIngestionResult {
  processedCount: number;
  newTickets: ProcessedTicketResult[];
}
