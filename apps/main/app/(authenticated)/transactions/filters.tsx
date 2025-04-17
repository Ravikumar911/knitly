import * as React from "react"
import { Table } from "@tanstack/react-table"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Button } from "@workspace/ui/components/button"
import { CalendarIcon, FilterIcon, X } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@workspace/ui/components/badge"
import type { Transaction, TransactionType } from "@workspace/database"
import { useTransactionFilters } from "@/store/transaction-filters"

interface TransactionFiltersProps {
  table: Table<Transaction>
}

export function TransactionFilters({ table }: TransactionFiltersProps) {
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false)
  
  // Use the Zustand store instead of local state
  const {
    type,
    category,
    startDate,
    endDate,
    amountMin,
    amountMax,
    setType,
    setCategory,
    setStartDate,
    setEndDate,
    setAmountMin,
    setAmountMax,
    resetFilters
  } = useTransactionFilters()
  
  // Get available categories from the data
  const availableCategories = React.useMemo(() => {
    if (!table) return []
    
    const categories = new Set<string>()
    try {
      table.getPreFilteredRowModel().rows.forEach(row => {
        if (row.original.category) {
          categories.add(row.original.category)
        }
      })
    } catch (error) {
      console.error("Error getting categories:", error)
      return []
    }
    return Array.from(categories).sort()
  }, [table])
  
  // Convert number values to strings for input fields
  const minAmountStr = amountMin !== null ? amountMin.toString() : ""
  const maxAmountStr = amountMax !== null ? amountMax.toString() : ""
  
  // Handle amount input changes
  const handleMinAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAmountMin(value ? parseFloat(value) : null)
  }
  
  const handleMaxAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAmountMax(value ? parseFloat(value) : null)
  }
  
  // Get the active filter count
  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (type !== null) count++
    if (category !== null) count++
    if (startDate !== null) count++
    if (endDate !== null) count++
    if (amountMin !== null) count++
    if (amountMax !== null) count++
    return count
  }, [type, category, startDate, endDate, amountMin, amountMax])
  
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <FilterIcon className="h-3.5 w-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 rounded-full px-1 py-0 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-4" align="start">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Transaction Type</h4>
                  <Select
                    value={type ?? "all"}
                    onValueChange={(value) => setType(value === "all" ? null : value as TransactionType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="DEBIT">Debit</SelectItem>
                      <SelectItem value="CREDIT">Credit</SelectItem>
                      <SelectItem value="TRANSFER">Transfer</SelectItem>
                      <SelectItem value="REFUND">Refund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {availableCategories.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Category</h4>
                    <Select
                      value={category ?? "all"}
                      onValueChange={(value) => setCategory(value === "all" ? null : value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {availableCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.toLowerCase().replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <h4 className="font-medium">Date Range</h4>
                  <div className="flex space-x-2">
                    <div className="grid gap-1.5">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal h-9"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? (
                              format(startDate, "PPP")
                            ) : (
                              <span>From</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={startDate || undefined}
                            onSelect={(date) => setStartDate(date || null)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid gap-1.5">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal h-9"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? (
                              format(endDate, "PPP")
                            ) : (
                              <span>To</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={endDate || undefined}
                            onSelect={(date) => setEndDate(date || null)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Amount Range</h4>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minAmountStr}
                      onChange={handleMinAmountChange}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxAmountStr}
                      onChange={handleMaxAmountChange}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Reset
                  </Button>
                  <Button size="sm" onClick={() => setIsFiltersOpen(false)}>
                    Apply Filters
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground"
              onClick={resetFilters}
            >
              Clear all
              <X className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          {type !== null && (
            <Badge variant="secondary" className="rounded-lg">
              Type: {type.toLowerCase()}
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setType(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {category !== null && (
            <Badge variant="secondary" className="rounded-lg">
              Category: {category.toLowerCase().replace(/_/g, ' ')}
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setCategory(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {startDate && (
            <Badge variant="secondary" className="rounded-lg">
              From: {format(startDate, "MMM d, yyyy")}
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setStartDate(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {endDate && (
            <Badge variant="secondary" className="rounded-lg">
              To: {format(endDate, "MMM d, yyyy")}
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setEndDate(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {(amountMin !== null || amountMax !== null) && (
            <Badge variant="secondary" className="rounded-lg">
              Amount: {amountMin !== null ? `${amountMin} ` : ''}
              {amountMin !== null && amountMax !== null && '- '}
              {amountMax !== null ? amountMax : ''}
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setAmountMin(null)
                  setAmountMax(null)
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
} 