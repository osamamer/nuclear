import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { Discover } from '../views/Discover';

export const Route = createFileRoute('/discover')({
  component: Discover,
  validateSearch: z.object({
    ai: z.string().max(300).optional(),
  }),
});
