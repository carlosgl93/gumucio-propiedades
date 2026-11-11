import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

import { db } from '@/firebase';
import type { Documento, Postulacion } from '@/models/application';
import { setApplicationStatus } from '@/services/application';

import { DocumentUploader } from './DocumentUploader';

interface Props {
  postulacion: Postulacion;
  uploadedBy: string;
  onBack: () => void;
}

async function fetchDocumentos(postulacionId: string): Promise<Documento[]> {
  const snap = await getDocs(
    query(
      collection(db, 'postulaciones', postulacionId, 'documentos'),
      orderBy('uploadedAt', 'desc'),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Documento);
}

export const PostulacionDetail = ({ postulacion, uploadedBy, onBack }: Props) => {
  const qc = useQueryClient();
  const { data: docs } = useQuery({
    queryKey: ['documentos', postulacion.id],
    queryFn: () => fetchDocumentos(postulacion.id),
  });

  const hasFail = docs?.some((d) => d.verdict === 'fail');
  const hasWarn = docs?.some((d) => d.verdict === 'warn');
  const aggregate: Postulacion['status'] = hasFail
    ? 'rejected'
    : hasWarn
      ? 'needs_more_docs'
      : docs && docs.length > 0
        ? 'approved'
        : 'pending';

  const refreshDocs = () => qc.invalidateQueries({ queryKey: ['documentos', postulacion.id] });

  return (
    <Box>
      <Button onClick={onBack}>← Volver</Button>
      <Typography variant="h5" sx={{ mt: 2 }}>
        {postulacion.applicantName} ({postulacion.applicantRut})
      </Typography>
      <Typography color="text.secondary">
        Renta objetivo: ${postulacion.monthlyRent.toLocaleString('es-CL')} CLP
      </Typography>
      <Chip label={`Estado: ${aggregate}`} sx={{ mt: 1 }} />

      <Divider sx={{ my: 3 }} />
      <Stack spacing={3}>
        <DocumentUploader
          postulacionId={postulacion.id}
          applicantName={postulacion.applicantName}
          applicantRut={postulacion.applicantRut}
          monthlyRent={postulacion.monthlyRent}
          uploadedBy={uploadedBy}
          type="dicom"
        />
        <DocumentUploader
          postulacionId={postulacion.id}
          applicantName={postulacion.applicantName}
          applicantRut={postulacion.applicantRut}
          monthlyRent={postulacion.monthlyRent}
          uploadedBy={uploadedBy}
          type="liquidacion"
        />
        <DocumentUploader
          postulacionId={postulacion.id}
          applicantName={postulacion.applicantName}
          applicantRut={postulacion.applicantRut}
          monthlyRent={postulacion.monthlyRent}
          uploadedBy={uploadedBy}
          type="carpeta_tributaria"
        />
      </Stack>

      {docs && docs.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6">Documentos cargados</Typography>
          {docs.map((d) => (
            <Box key={d.id} sx={{ p: 1, mb: 1, border: '1px solid', borderRadius: 1 }}>
              <Typography>
                {d.type} — {d.verdict} ({d.score})
              </Typography>
              <Typography variant="caption">{d.fileUrl}</Typography>
            </Box>
          ))}
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="success"
              onClick={async () => {
                await setApplicationStatus(postulacion.id, 'approved', uploadedBy);
                refreshDocs();
              }}
            >
              Aprobar postulación
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={async () => {
                await setApplicationStatus(postulacion.id, 'rejected', uploadedBy);
                refreshDocs();
              }}
            >
              Rechazar
            </Button>
          </Stack>
        </>
      )}
    </Box>
  );
};
