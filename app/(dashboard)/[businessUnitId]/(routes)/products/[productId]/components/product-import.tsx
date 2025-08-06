'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "react-hot-toast"

export interface ExcelProduct {
  barCode: string;
  name: string;
  itemDesc: string;
  price: number;
  categoryId: string;
  colorId: string;
  sizeId: string;
  isFeatured: boolean;
  isArchived: boolean;
}

interface ProductImportProps {
  onImport: (products: ExcelProduct[]) => void;
}

export const ProductImport: React.FC<ProductImportProps> = ({ onImport }) => {
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file to import')
      return
    }

    try {
      const data = await readExcel(file)
      onImport(data)
      toast.success('Products imported successfully')
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import products')
    }
  }

  const readExcel = (file: File): Promise<ExcelProduct[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet)
        resolve(jsonData as ExcelProduct[])
      }
      reader.onerror = (error) => reject(error)
      reader.readAsBinaryString(file)
    })
  }

  return (
    <div className="space-y-4">
      <Input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
      />
      <Button onClick={handleImport} disabled={!file}>
        Import Products
      </Button>
    </div>
  )
}