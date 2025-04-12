'use client';

import { useState } from 'react';

import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';

import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@workspace/ui/components/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@workspace/ui/components/form';
import { Input } from '@workspace/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Switch } from '@workspace/ui/components/switch';
import { Textarea } from '@workspace/ui/components/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTRPC } from '@/trpc/client';  

// Define our own type that matches the API response
type EmailExtractionPattern = {
  id: string;
  emailPattern: string | null;
  subjectPattern: string | null;
  bodyPattern: string | null;
  extractionType: string;
  config: string | null;
  priority: number | null;
  isActive: boolean | null;
  updatedAt: string;
  createdAt: string;
};

// Form schema matching our API schema
const formSchema = z.object({
  emailPattern: z.string().optional(),
  subjectPattern: z.string().optional(),
  bodyPattern: z.string().optional(),
  extractionType: z.string(),
  config: z.string().optional(),
  priority: z.number().optional(),
  isActive: z.boolean().optional()
});

type FormData = z.infer<typeof formSchema>;

function EmailPatternsSettingsContent() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<{ id: string; data: FormData } | null>(null);

  const trpc = useTRPC(); 
  const queryClient = useQueryClient();
  const { data: patterns, isLoading, refetch: refetchPatterns } = useQuery(trpc.emailExtractionPatterns.getAll.queryOptions());
  const createMutation = useMutation(trpc.emailExtractionPatterns.create.mutationOptions({
    onSuccess: () => {
      refetchPatterns();
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      console.error(error);
    },
  }));
  const updateMutation = useMutation(trpc.emailExtractionPatterns.update.mutationOptions({
    onSuccess: () => {
      refetchPatterns();
      setEditingPattern(null);
    },
    onError: (error) => {
      console.error(error);
    },
  }));
  const deleteMutation = useMutation(trpc.emailExtractionPatterns.delete.mutationOptions({
    onSuccess: () => {
      refetchPatterns();
    },
    onError: (error) => {
      console.error(error);
    },
  }));

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emailPattern: '',
      subjectPattern: '',
      bodyPattern: '',
      extractionType: '',
      config: '',
      priority: 0,
      isActive: true
    }
  });

  const onSubmit = async (data: FormData) => {
    if (editingPattern) {
      await updateMutation.mutateAsync({
        id: editingPattern.id,
        data
      });
    } else {
      await createMutation.mutateAsync(data);
    }
    form.reset();
  };

  const handleEdit = (pattern: EmailExtractionPattern) => {
    const formData: FormData = {
      emailPattern: pattern.emailPattern || undefined,
      subjectPattern: pattern.subjectPattern || undefined,
      bodyPattern: pattern.bodyPattern || undefined,
      extractionType: pattern.extractionType,
      config: pattern.config || undefined,
      priority: pattern.priority || undefined,
      isActive: pattern.isActive || undefined
    };
    setEditingPattern({ id: pattern.id, data: formData });
    form.reset(formData);
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this pattern?')) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Extraction Patterns</CardTitle>
          <CardDescription>
            Manage patterns used to extract information from emails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Button onClick={() => {
              form.reset();
              setEditingPattern(null);
              setIsCreateDialogOpen(true);
            }}>
              Add New Pattern
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email Pattern</TableHead>
                <TableHead>Subject Pattern</TableHead>
                <TableHead>Extraction Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patterns?.map((pattern) => (
                <TableRow key={pattern.id}>
                  <TableCell>{pattern.emailPattern || '-'}</TableCell>
                  <TableCell>{pattern.subjectPattern || '-'}</TableCell>
                  <TableCell>{pattern.extractionType}</TableCell>
                  <TableCell>{pattern.priority}</TableCell>
                  <TableCell>{pattern.isActive ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell>
                    <Button variant="outline" className="mr-2" onClick={() => handleEdit(pattern)}>
                      Edit
                    </Button>
                    <Button variant="destructive" onClick={() => handleDelete(pattern.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPattern ? 'Edit Pattern' : 'Create New Pattern'}</DialogTitle>
            <DialogDescription>
              {editingPattern 
                ? 'Edit the extraction pattern details below.'
                : 'Add a new email extraction pattern to process emails.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="emailPattern"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Email Pattern</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., *@bank.com" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>Pattern to match sender email addresses</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subjectPattern"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Subject Pattern</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Transaction Alert*" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>Pattern to match email subjects</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bodyPattern"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Body Pattern</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Regular expression to extract data"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>Pattern to extract data from email body</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="extractionType"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Extraction Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TRANSACTION">Transaction</SelectItem>
                        <SelectItem value="BALANCE">Balance</SelectItem>
                        <SelectItem value="STATEMENT">Statement</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Type of data to extract</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="config"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Configuration</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="JSON configuration"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>Additional JSON configuration for extraction</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(parseInt(e.target.value) || 0)}
                        value={field.value || 0}
                      />
                    </FormControl>
                    <FormDescription>Higher priority patterns are tried first</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }: { field: any }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Enable or disable this pattern</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPattern ? 'Update Pattern' : 'Create Pattern'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EmailPatternsSettings() {
  return (
      <EmailPatternsSettingsContent />
  );
} 