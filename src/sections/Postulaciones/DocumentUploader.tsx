import { useState } from 'react';

import { Button, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';

import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/firebase';
import type { DocType, VerificationResult } from '@/models/application';
import { addDocumentWithVerdict } from '@/services/application';

import { VerdictPanel } from './VerdictPanel';

interface Props {
  postulacionId: string;
  applicantName: string;
  applicantRut: string;
  monthlyRent: number;
  uploadedBy: string;
  type: DocType;
}

export const DocumentUploader = ({
  postulacionId,
  applicantName,
  applicantRut,
  monthlyRent,
  uploadedBy,
  type,
}: Props) => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf' || file.size > 5 * 1024 * 1024) {
      setError('Solo PDF, máx 5MB');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      fd.append('applicantName', applicantName);
      fd.append('applicantRut', applicantRut);
      fd.append('monthlyRent', String(monthlyRent));

      const res = await fetch('/api/verifyDocument', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const verification = (await res.json()) as VerificationResult;
      setResult(verification);

      const filename = `${type}-${Date.now()}.pdf`;
      const fileRef = ref(storage, `postulaciones/${postulacionId}/${filename}`);
      await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(fileRef);
      await addDocumentWithVerdict(postulacionId, { type, fileUrl, verification, uploadedBy });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1">
        Subir{' '}
        {type === 'dicom'
          ? 'DICOM'
          : type === 'liquidacion'
            ? 'Liquidación de sueldo'
            : 'Carpeta Tributaria'}
      </Typography>
      <Button variant="outlined" component="label" disabled={busy}>
        {busy ? <CircularProgress size={20} /> : 'Seleccionar PDF'}
        <input
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </Button>
      {result && <VerdictPanel result={result} />}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        message={error}
      />
    </Stack>
  );
};
