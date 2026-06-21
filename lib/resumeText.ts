export type ResumeParserStatus = 'parsed' | 'empty' | 'unsupported' | 'failed';

export type ResumeTextResult = {
  resumeText: string;
  parserStatus: ResumeParserStatus;
  parserError?: string;
};

const MIN_RESUME_TEXT_LENGTH = 80;

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function getExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || '';
}

function isPdf(buffer: Buffer) {
  return buffer.subarray(0, 4).toString('ascii') === '%PDF';
}

function isZip(buffer: Buffer) {
  if (buffer.length < 4) return false;

  return (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    ((buffer[2] === 0x03 && buffer[3] === 0x04) ||
      (buffer[2] === 0x05 && buffer[3] === 0x06) ||
      (buffer[2] === 0x07 && buffer[3] === 0x08))
  );
}

function getFileKind(file: File, buffer: Buffer) {
  const extension = getExtension(file.name || '');
  const type = (file.type || '').toLowerCase();

  if (isPdf(buffer)) return 'pdf';
  if (isZip(buffer) && extension === 'docx') return 'docx';
  if (type.startsWith('text/') || extension === 'txt') return 'txt';

  if (type === 'application/pdf' || extension === 'pdf') return 'pdf';

  return 'unsupported';
}

function toSafeParserError(error: unknown) {
  if (error instanceof Error && error.message.toLowerCase().includes('password')) {
    return 'Could not parse the resume because the file appears to be password protected.';
  }

  return 'Could not extract text from this resume. Please upload a readable PDF, DOCX, or TXT file.';
}

function resultFromText(text: string): ResumeTextResult {
  const resumeText = normalizeWhitespace(text);

  if (resumeText.length < MIN_RESUME_TEXT_LENGTH) {
    return {
      resumeText: '',
      parserStatus: 'empty',
      parserError: 'Could not find enough resume text in this file.'
    };
  }

  return {
    resumeText,
    parserStatus: 'parsed'
  };
}

async function loadPdfParser() {
  try {
    const pdfParse = await import('pdf-parse');
    return pdfParse.PDFParse;
  } catch {
    return null;
  }
}

async function loadDocxParser() {
  try {
    const mammoth = await import('mammoth');
    return mammoth.default || mammoth;
  } catch {
    return null;
  }
}

export async function extractResumeText(file: File): Promise<ResumeTextResult> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileKind = getFileKind(file, buffer);

    if (fileKind === 'unsupported') {
      return {
        resumeText: '',
        parserStatus: 'unsupported',
        parserError: 'Unsupported resume file type. Please upload a PDF, DOCX, or TXT file.'
      };
    }

    // Proper production parsing should eventually be upgraded to a dedicated resume parser
    // or stronger structured parser, but this MVP extractor must at least store raw resume
    // text so the rewrite can preserve real employers, titles, and bullets.
    if (fileKind === 'pdf') {
      const PDFParse = await loadPdfParser();
      if (!PDFParse) {
        return {
          resumeText: '',
          parserStatus: 'failed',
          parserError: 'PDF parser failed to load'
        };
      }

      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const parsed = await parser.getText();
        return resultFromText(parsed.text || '');
      } finally {
        await parser.destroy();
      }
    }

    if (fileKind === 'docx') {
      const mammoth = await loadDocxParser();
      if (!mammoth) {
        return {
          resumeText: '',
          parserStatus: 'failed',
          parserError: 'DOCX parser failed to load'
        };
      }

      const parsed = await mammoth.extractRawText({ buffer });
      return resultFromText(parsed.value || '');
    }

    return resultFromText(buffer.toString('utf8'));
  } catch (error) {
    return {
      resumeText: '',
      parserStatus: 'failed',
      parserError: toSafeParserError(error)
    };
  }
}
