declare module "mailparser" {
  export type MailHeaderLine = {
    key: string;
    line: string;
  };

  export type MailAttachment = {
    filename?: string | null;
    contentType?: string;
    content: Buffer;
  };

  export type ParsedMailAddress = {
    text?: string | null;
  };

  export type ParsedMail = {
    subject?: string | null;
    text?: string | null;
    html?: string | false | { toString(): string } | null;
    attachments?: MailAttachment[];
    from?: ParsedMailAddress | null;
    date?: Date | null;
    headerLines?: MailHeaderLine[];
  };

  export function simpleParser(source: string | Buffer): Promise<ParsedMail>;
}
