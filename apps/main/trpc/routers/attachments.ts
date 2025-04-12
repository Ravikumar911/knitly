import { z } from 'zod';
import { createTRPCRouter, baseProcedure } from '../init';

export const attachmentsRouter = createTRPCRouter({
  download: baseProcedure
    .input(z.object({
      id: z.string().optional(),  // Optional ID if needed for different attachments
    }))
    .output(z.object({
      data: z.object({
        data: z.string(),  // Base64 encoded data
        size: z.number(),
      }),
    }))
    .query(() => {
      // Return the static attachment data
      return {
        data: {
          data: "JVBERi0xLjQKJfbk_N8KMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovVmVyc2lvbiAvMS43Ci9QYWdlcyAyIDAgUgovQWNyb0Zvcm0gMyAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0NyZWF0aW9uRGF0ZSAoRDoyMDI1MDQxMTA4MTk1NSswNSczMCcpCi9Qcm9kdWNlciAob3Blbmh0bWx0b3BkZi5jb20pCi9UaXRsZSAoU3dpZ2d5IEludm9pY2UpCj4-CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbNSAwIFIgNiAwIFJdCi9Db3VudCAyCj4-CmVuZG9iagozIDAgb2JqCjw8Ci9GaWVsZHMgWzcgMCBSXQovU2lnRmxhZ3MgMwovREEgKC9IZWx2IDAgVGYgMCBnICkKL0RSIDggMCBSCj4-CmVuZG9iago1IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9NZWRpYUJveCBbMC4wIDAuMCA4NDEuODc1IDExOTAuNTVdCi9QYXJlbnQgMiAwIFIKL0NvbnRlbnRzIDkgMCBSCi9SZXNvdXJjZXMgMTAgMCBSCi9Dcm9wQm94IFswLjAgMC4wIDg0MS44NzUgMTE5MC41NV0KL1JvdGF0ZSAwCj4-CmVuZG9iago2IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9NZWRpYUJveCBbMC4wIDAuMCA4NDEuODc1IDExOTAuNTVdCi9QYXJlbnQgMiAwIFIKL0NvbnRlbnRzIDExIDAgUgovUmVzb3VyY2VzIDEyIDAgUgovQW5ub3RzIFs3IDAgUl0KL0Nyb3BCb3ggWzAuMCAwLjAgODQxLjg3NSAxMTkwLjU1XQovUm90YXRlIDAKPj4KZW5kb2JqCjcgMCBvYmoKPDwKL0ZUIC9TaWcKL1R5cGUgL0Fubm90Ci9TdWJ0eXBlIC9XaWRnZXQKL0YgMTMyCi9UIChTaWduYXR1cmUxKQovViAx",
          size: 40591
        }
      };
    }),
}); 