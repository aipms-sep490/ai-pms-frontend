export interface KnowledgeDocument {
  id: number
  title: string
  documentType: string
  departmentId: number | null
  academicSemesterId: number | null
  projectPeriodId: number | null
  status: string
  currentVersion: string
  createdAt: string
  updatedAt: string
}

export interface KnowledgeVersion {
  id: number
  documentId: number
  version: string
  status: string
  sourceFileName: string | null
  effectiveFrom: string | null
  effectiveTo: string | null
  createdAt: string
  publishedAt: string | null
  chunkCount: number
}

export interface KnowledgeVersionInput {
  version: string
  content: string
  sourceFileName: string | null
  effectiveFrom: string | null
  effectiveTo: string | null
  chunks: { heading: string | null; pageNumber: number | null; content: string }[] | null
}

export interface KnowledgeDocumentInput extends KnowledgeVersionInput {
  title: string
  documentType: string
  departmentId: number | null
  academicSemesterId: number | null
  projectPeriodId: number | null
}
