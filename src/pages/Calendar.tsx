import React from 'react';
import { AgencyCalendar } from '@/components/AgencyCalendar';
import { PageContainer, PageHeader } from '@/components/layout';

export default function Calendar() {
  return (
    <PageContainer>
      <PageHeader 
        title="Calendar"
        description="View company events, holidays, team leave, and birthdays"
      />
      
      <AgencyCalendar />
    </PageContainer>
  );
}