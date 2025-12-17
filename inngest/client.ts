import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'shoppeai',
  eventKey: process.env.NODE_ENV === 'development' ? 'local' : process.env.INNGEST_EVENT_KEY,
});
