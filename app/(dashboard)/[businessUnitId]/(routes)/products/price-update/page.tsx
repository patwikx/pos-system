"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Plus, Trash, Search, Package, DollarSign, CheckCircle, AlertCircle, X, Upload, Download } from "lucide-react";

import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertModal } from "@/components/modals/alert-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// --- TYPES ---
type ProductWithDetails = {
    id: string; name: string; barCode: string; price: number;
    category: { name: string }; size: { name: string }; color: { name: string };
};
type ImportedRow = {
    barcode?: string;
    price?: string;
};

export default function UpdatePricesPage() {
    const params = useParams();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- STATE MANAGEMENT ---
    const [loading, setLoading] = useState(false); // For final submission
    const [searchLoading, setSearchLoading] = useState(false); // For manual search
    const [importLoading, setImportLoading] = useState(false); // For import process
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<ProductWithDetails[]>([]);
    const [stagedProducts, setStagedProducts] = useState<ProductWithDetails[]>([]);
    const [newPrices, setNewPrices] = useState<Record<string, string>>({});
    const [priceErrors, setPriceErrors] = useState<Record<string, string>>({});
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // --- TEMPLATE DOWNLOAD LOGIC ---
    const handleDownloadTemplate = () => {
        const csvContent = "barcode,price\n1234567890123,99.99\n9876543210987,150.50";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "price_update_template.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            toast({ title: "Download failed", description: "Your browser does not support this feature.", variant: "destructive" });
        }
    };
    
    // --- IMPORT LOGIC ---
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImportLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                let importedData: ImportedRow[] = [];

                if (file.name.endsWith('.csv')) {
                    const parsedCsv = Papa.parse(data as string, {
                        header: true, skipEmptyLines: true,
                        transformHeader: header => header.toLowerCase().trim()
                    });
                    importedData = parsedCsv.data as ImportedRow[];
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
                    importedData = jsonData.map(row => {
                        const newRow: { [key: string]: any } = {};
                        for (const key in row) { newRow[key.toLowerCase().trim()] = row[key]; }
                        return newRow;
                    }) as ImportedRow[];
                }
                await processImportedData(importedData);
            } catch (error) {
                toast({ title: "Import Error", description: "Failed to parse the file.", variant: "destructive" });
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = "";
                setImportLoading(false);
            }
        };
        reader.onerror = () => { toast({ title: "File Error", variant: "destructive"}); setImportLoading(false); };
        if (file.name.endsWith('.csv')) reader.readAsText(file);
        else reader.readAsBinaryString(file);
    };

    const processImportedData = async (importedData: ImportedRow[]) => {
        const validRows = importedData.filter(row => row.barcode && row.price);
        if (validRows.length === 0) {
            toast({ title: "Invalid File", description: "No valid 'barcode' and 'price' columns found.", variant: "destructive" });
            return;
        }
        const barcodesToLookup = [...new Set(validRows.map(row => String(row.barcode!)))];
        try {
            const response = await axios.post(`/api/${params.storeId}/products/bulk-lookup`, { barcodes: barcodesToLookup });
            const foundProducts: ProductWithDetails[] = response.data;
            const priceMap = new Map(validRows.map(row => [String(row.barcode!), String(row.price!)]));
            const newProductsToStage = foundProducts.filter(p => !stagedProducts.some(sp => sp.id === p.id));
            const newPricesToSet = Object.fromEntries(
                newProductsToStage.map(p => [p.id, priceMap.get(p.barCode)]).filter((pair): pair is [string, string] => pair[1] !== undefined)
            );

            setStagedProducts(prev => [...prev, ...newProductsToStage]);
            setNewPrices(prev => ({ ...prev, ...newPricesToSet }));
            toast({ title: "Import Complete", description: `${newProductsToStage.length} new products staged.` });
        } catch (error) {
            toast({ title: "API Error", description: "Could not look up products from the imported file.", variant: "destructive" });
        }
    };

    // --- SEARCH & STAGING LOGIC ---
    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            setSearchResults([]); setShowSearchResults(false); return;
        }
        setSearchLoading(true);
        try {
            const response = await axios.get(`/api/${params.storeId}/products/search?q=${searchTerm}`);
            setSearchResults(response.data);
            setShowSearchResults(true);
        } catch (error) {
            toast({ title: "Search Failed", variant: "destructive" });
        } finally {
            setSearchLoading(false);
        }
    };

    const addProductToStage = (product: ProductWithDetails) => {
        if (stagedProducts.find(p => p.id === product.id)) {
            toast({ title: "Product Already Added" }); return;
        }
        setStagedProducts(prev => [...prev, product]);
        toast({ title: "Product Added", description: `${product.name} has been added.` });
    };
    
    const removeProductFromStage = (productId: string) => {
        setStagedProducts(prev => prev.filter(p => p.id !== productId));
        setNewPrices(prev => { const p = { ...prev }; delete p[productId]; return p; });
        setPriceErrors(prev => { const e = { ...prev }; delete e[productId]; return e; });
    };
    
    const handlePriceChange = (productId: string, value: string) => {
        if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
            setNewPrices(prev => ({ ...prev, [productId]: value }));
            const numValue = parseFloat(value);
            if (value !== "" && (isNaN(numValue) || numValue <= 0)) {
                setPriceErrors(prev => ({ ...prev, [productId]: "Price must be greater than 0" }));
            } else {
                setPriceErrors(prev => { const e = { ...prev }; delete e[productId]; return e; });
            }
        }
    };

    // --- SUBMIT LOGIC ---
    const onBulkUpdate = async () => {
        setLoading(true);
        try {
            const payload = Object.entries(newPrices)
                .filter(([, price]) => price.trim() !== "" && !isNaN(parseFloat(price)) && parseFloat(price) > 0)
                .map(([productId, price]) => ({ id: productId, price: parseFloat(price) }));
            if (payload.length === 0) {
                toast({ title: "No Valid Changes to Save", variant: "destructive" });
                setLoading(false); return;
            }
            await axios.patch(`/api/${params.storeId}/products/bulk-update`, { products: payload });
            toast({ title: "Prices Updated Successfully" });
            setStagedProducts([]); setNewPrices({}); setPriceErrors({});
        } catch (error) {
            toast({ title: "Update Failed", variant: "destructive" });
        } finally {
            setLoading(false);
            setIsConfirmModalOpen(false);
        }
    };

    const validPriceChanges = Object.entries(newPrices).filter(([_,p])=>p.trim()!==""&&!isNaN(parseFloat(p))&&parseFloat(p)>0);
    const totalPriceIncrease = validPriceChanges.reduce((total,[pId,newPrice])=>{const p=stagedProducts.find(p=>p.id===pId);return p?total+(parseFloat(newPrice)-p.price):total;},0);
    const hasErrors = Object.keys(priceErrors).length > 0;

    return (
        <>
            <AlertModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={onBulkUpdate} loading={loading} />
            <div className="flex-col">
                <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
                    <div className="flex items-center justify-between">
                        <Heading title="Bulk Price Update" description="Search for products or import a file to update prices." />
                        {stagedProducts.length > 0 && (
                            <div className="flex items-center gap-4">
                                <Badge variant="secondary" className="text-sm">{stagedProducts.length} Products Staged</Badge>
                                {validPriceChanges.length > 0 && (
                                    <Badge variant={totalPriceIncrease >= 0 ? "default" : "destructive"} className="text-sm">
                                        {totalPriceIncrease >= 0 ? "+" : ""}₱{totalPriceIncrease.toFixed(2)} Total Change
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>
                    <Separator />

                    <Card>
                        <CardHeader>
                            <CardTitle>Find Products</CardTitle>
                            <CardDescription>Search for items, import a file, or download a template to begin.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input type="file" accept=".csv, .xlsx, .xls" ref={fileInputRef} onChange={handleFileImport} className="hidden"/>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative flex-1 min-w-[250px] max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search by name or barcode..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="pl-10" disabled={loading || importLoading} />
                                </div>
                                <Button onClick={handleSearch} disabled={searchLoading || loading || importLoading || !searchTerm.trim()}>
                                    {searchLoading ? "Searching..." : "Search"}
                                </Button>
                                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={loading || searchLoading || importLoading}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {importLoading ? "Importing..." : "Import File"}
                                </Button>
                                <Button variant="outline" onClick={handleDownloadTemplate} disabled={loading || searchLoading || importLoading}>
                                    <Download className="mr-2 h-4 w-4" /> Template
                                </Button>
                            </div>
                            
                            {showSearchResults && (
                                <div className="border rounded-lg mt-4">
                                    {searchLoading ? (
                                        <div className="p-4 space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                                    ) : searchResults.length > 0 ? (
                                        <div className="max-h-60 overflow-y-auto">
                                            {searchResults.map(product => (
                                                <div key={product.id} className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer border-b last:border-b-0" onClick={() => addProductToStage(product)}>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /> <span className="font-medium">{product.name}</span></div>
                                                        <div className="text-sm text-muted-foreground mt-1">{product.barCode} • ₱{product.price.toFixed(2)}</div>
                                                    </div>
                                                    <Button size="sm" variant="ghost"><Plus className="h-4 w-4" /></Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center"><Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" /> <h3 className="font-semibold">No Products Found</h3><p className="text-sm text-muted-foreground">Try adjusting your search terms.</p></div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><DollarSign /> Price Updates ({stagedProducts.length})</CardTitle>
                            <CardDescription>Review and modify prices for selected products before applying changes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stagedProducts.length === 0 ? (
                                <div className="text-center py-12"><DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">No Products Staged</h3><p className="text-muted-foreground mb-4">Search for products or import a file to begin.</p></div>
                            ) : (
                                <div className="border rounded-lg overflow-x-auto">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Product Details</TableHead><TableHead>Current Price</TableHead><TableHead>New Price</TableHead><TableHead>Change</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {stagedProducts.map(product => {
                                                const newPrice = newPrices[product.id] || "";
                                                const numNewPrice = parseFloat(newPrice);
                                                const hasValidPrice = newPrice !== "" && !isNaN(numNewPrice) && numNewPrice > 0;
                                                const priceChange = hasValidPrice ? numNewPrice - product.price : 0;
                                                const hasError = priceErrors[product.id];
                                                return (
                                                    <TableRow key={product.id}>
                                                        <TableCell><div><div className="font-medium">{product.name}</div><div className="text-sm text-muted-foreground">{product.barCode} • {product.category.name}</div></div></TableCell>
                                                        <TableCell><span className="font-mono">₱{product.price.toFixed(2)}</span></TableCell>
                                                        <TableCell><div className="space-y-1"><Input type="text" value={newPrice} onChange={(e) => handlePriceChange(product.id, e.target.value)} className={cn("w-28 font-mono", hasError && "border-destructive")} placeholder="₱0.00" disabled={loading}/>{hasError && (<p className="text-xs text-destructive">{hasError}</p>)}</div></TableCell>
                                                        <TableCell>{hasValidPrice && (<div className={cn("flex items-center gap-1 font-mono text-sm", priceChange > 0 && "text-green-600", priceChange < 0 && "text-red-600")}>{priceChange > 0 && "+"}₱{priceChange.toFixed(2)}</div>)}</TableCell>
                                                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeProductFromStage(product.id)} disabled={loading} className="h-8 w-8"><Trash className="h-4 w-4 text-muted-foreground hover:text-destructive" /></Button></TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {stagedProducts.length > 0 && (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1"><div className="flex items-center gap-2">{hasErrors ? <AlertCircle className="h-4 w-4 text-destructive" /> : validPriceChanges.length > 0 ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-muted-foreground" />}<span className="font-medium">{validPriceChanges.length} of {stagedProducts.length} products ready</span></div>{validPriceChanges.length > 0 && !hasErrors && (<p className="text-sm text-muted-foreground">Total price change: {totalPriceIncrease >= 0 ? "+" : ""}₱{totalPriceIncrease.toFixed(2)}</p>)}</div>
                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={() => { setStagedProducts([]); setNewPrices({}); setPriceErrors({}); }} disabled={loading}>Clear All</Button>
                                        <Button onClick={() => setIsConfirmModalOpen(true)} disabled={loading || validPriceChanges.length === 0 || hasErrors} className="min-w-[140px]">{loading ? "Updating..." : `Update ${validPriceChanges.length} Prices`}</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}