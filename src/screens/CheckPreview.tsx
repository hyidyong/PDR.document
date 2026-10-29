import { useEffect, useState } from 'react'
import { FileIcon } from '../components/common'
import { UploadBox } from '../components/documents'

export function EmptyUpload({ onFileSelect }: { onFileSelect: (file: File) => void }) {
  return <div className="check-empty-upload"><UploadBox accept=".pdf,application/pdf" formats="PDF" onFileSelect={onFileSelect}>서류 파일을 올려주세요</UploadBox></div>
}

export function PreviewFile({ file, page }: { file: File; page?: number }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    const timer = setTimeout(() => setUrl(objectUrl), 0)
    return () => { clearTimeout(timer); URL.revokeObjectURL(objectUrl) }
  }, [file])
  const currentPage = page && page > 0 ? page : 1
  return <div className="check-viewer"><aside className="check-thumbnail"><div className="check-thumbnail__page"><FileIcon width={26} height={26} /></div><span>{currentPage}</span></aside><div className="check-viewer__stage">{url && <iframe src={`${url}#page=${currentPage}&toolbar=0`} title={`${file.name} ${currentPage}쪽 미리보기`} />}</div></div>
}
