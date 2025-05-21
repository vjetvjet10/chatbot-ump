// "use client"
// console.log("🧪 PdfPreview component mounted")
// import { useState } from "react"
// import { Document, Page } from "react-pdf"
// import { pdfjs } from "react-pdf"
// import "react-pdf/dist/Page/AnnotationLayer.css"
// import "react-pdf/dist/Page/TextLayer.css"

// pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

// interface PdfPreviewProps {
//   fileUrl: string
// }

// export default function PdfPreview({ fileUrl }: PdfPreviewProps) {
//   const [numPages, setNumPages] = useState<number>(0)

//   return (
//     <div className="pdf-preview max-w-full overflow-x-auto border rounded p-2">
//       <Document
//         file={fileUrl}
//         onLoadSuccess={({ numPages }) => setNumPages(numPages)}
//         onLoadError={(error) => console.error("❌ Lỗi tải PDF:", error)}
//         loading={<p>Đang tải...</p>}
//       >
//         {Array.from({ length: numPages }, (_, index) => (
//           <Page
//             key={`page_${index + 1}`}
//             pageNumber={index + 1}
//             width={600}
//           />
//         ))}
//       </Document>
//     </div>
//   )
// }
"use client"

import { useState } from "react"
import { Document, Page } from "react-pdf"
import { pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

interface PdfPreviewProps {
  fileUrl: string
}

export default function PdfPreview({ fileUrl }: PdfPreviewProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log(`📄 Đã tải thành công: ${fileUrl}, số trang: ${numPages}`)
    setNumPages(numPages)
    setError(null)
  }

  const handleLoadError = (err: unknown) => {
    console.error(`❌ Lỗi khi tải PDF: ${fileUrl}`, err)
    setError("Không thể hiển thị file PDF này.")
  }

  return (
    <div className="pdf-preview max-w-full overflow-x-auto border rounded p-2">
      {error && <p className="text-red-600 text-sm">❌ {error}</p>}
      <Document
        file={fileUrl}
        onLoadSuccess={handleLoadSuccess}
        onLoadError={handleLoadError}
        loading={<p>⏳ Đang tải PDF...</p>}
        error={<p className="text-red-600">⚠️ Không thể tải file PDF.</p>}
      >
        {Array.from({ length: numPages }, (_, index) => (
          <Page key={`page_${index + 1}`} pageNumber={index + 1} width={600} />
        ))}
      </Document>
    </div>
  )
}
