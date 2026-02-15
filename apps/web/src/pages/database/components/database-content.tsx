import { view, useService } from '@rabjs/react';
import { DatabaseService } from '../../../services/database.service';
import { DatabaseBrowserPage } from '../database-browser';
import { TableSchemaView } from './table-schema';

export const DatabaseContent = view(() => {
  const databaseService = useService(DatabaseService);

  // If a table is selected, show the table schema view
  if (databaseService.selectedTable) {
    return <TableSchemaView tableName={databaseService.selectedTable} />;
  }

  // Otherwise show the database browser
  return <DatabaseBrowserPage />;
});
