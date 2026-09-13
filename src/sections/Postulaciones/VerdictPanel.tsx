import { Alert, Box, Chip, List, ListItem, ListItemText, Typography } from '@mui/material';

import type { VerificationResult } from '@/models/application';

interface Props {
  result: VerificationResult;
}

const verdictToSeverity = (v: VerificationResult['verdict']) =>
  v === 'pass' ? 'success' : v === 'warn' ? 'warning' : 'error';

export const VerdictPanel = ({ result }: Props) => (
  <Box>
    <Alert severity={verdictToSeverity(result.verdict)} sx={{ mb: 2 }}>
      <strong>{result.verdict.toUpperCase()}</strong> — Score: {result.score}/100
      {result.llmUnavailable && ' (sin evaluación IA)'}
    </Alert>
    {result.flags.length > 0 && (
      <>
        <Typography variant="subtitle2">Observaciones:</Typography>
        <List dense>
          {result.flags.map((f) => (
            <ListItem key={f.code}>
              <ListItemText
                primary={
                  <>
                    <Chip label={f.code} size="small" sx={{ mr: 1 }} />
                    {f.message}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      </>
    )}
    {Object.keys(result.extractedFields).length > 0 && (
      <>
        <Typography variant="subtitle2" sx={{ mt: 2 }}>
          Campos extraídos:
        </Typography>
        <Box component="pre" sx={{ bgcolor: 'grey.100', p: 1, fontSize: 12, overflow: 'auto' }}>
          {JSON.stringify(result.extractedFields, null, 2)}
        </Box>
      </>
    )}
  </Box>
);
