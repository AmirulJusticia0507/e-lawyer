import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { api, jurisdictionLabels } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, Badge, Input, Select, Textarea, EmptyState, Field } from '../components/ui';
import type {
  CaseSummary,
  DocumentTemplate,
  DocumentType,
  JudgmentVerdict,
  LegalDocument,
  PowerOfAttorneyType,
} from '../types';

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  POWER_OF_ATTORNEY: 'Surat Kuasa',
  COMPLAINT: 'Gugatan',
  ANSWER: 'Jawaban',
  REPLY: 'Replik',
  DUPLICATION: 'Duplik',
  CONCLUSION: 'Kesimpulan',
  JUDGMENT: 'Putusan',
  OTHER: 'Dokumen lain',
};

const VERDICT_LABELS: Record<JudgmentVerdict, string> = {
  GRANTED: 'Dikabulkan',
  REJECTED: 'Ditolak',
  INADMISSIBLE: 'Tidak dapat diterima',
  SETTLED: 'Damai',
  DEFAULT: 'Verstek',
  OTHER: 'Lainnya',
};

const STATUS_TONES: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  DRAFT: 'info',
  SUBMITTED: 'warning',
  SIGNED: 'success',
  ARCHIVED: 'neutral',
};

const POA_TYPES = [
  { value: 'SPECIFIC', label: 'Khusus' },
  { value: 'GENERAL', label: 'Umum' },
  { value: 'SPECIAL', label: 'Istimewa' },
];

const VERDICT_OPTIONS = Object.entries(VERDICT_LABELS).map(([value, label]) => ({ value, label }));

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Terjadi kesalahan. Coba lagi.';
}

function printDocument(document: LegalDocument): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('Popup diblokir browser. Izinkan popup untuk mencetak dokumen.');
  printWindow.opener = null;
  const escapeHtml = (value: string) => {
    const map: Record<string, string> = { '&': '&', '<': '<', '>': '>', '"': '"', "'": "'" };
    return value.replace(/[&<>"']/g, (char) => map[char] ?? char);
  };
  printWindow.document.write(
    `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${escapeHtml(document.title)}</title><style>body{font:12pt Georgia,serif;max-width:760px;margin:48px auto;line-height:1.7;color:#111}h1{font-size:16pt;text-align:center}pre{font:inherit;white-space:pre-wrap} @media print{body{margin:24mm}}</style></head><body><h1>${escapeHtml(document.title)}</h1><pre>${escapeHtml(document.content)}</pre></body></html>`,
  );
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export default function Documents() {
  const { user } = useAuth();
  const canCreateJudgment = user?.permissions.includes('CREATE:JUDGMENT') ?? false;
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [caseId, setCaseId] = useState('');
  const [type, setType] = useState<DocumentType>('COMPLAINT');
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<LegalDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [content, setContent] = useState('');
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiSourceText, setAiSourceText] = useState('');
  const [aiDraft, setAiDraft] = useState('');
  const [poa, setPoa] = useState({
    type: 'SPECIFIC' as PowerOfAttorneyType,
    principalName: '',
    principalNik: '',
    principalNpwp: '',
    attorneyName: '',
    attorneyLicenseNo: '',
    attorneyNpwp: '',
    authority: '',
  });
  const [verdict, setVerdict] = useState<JudgmentVerdict>('GRANTED');
  const [judgment, setJudgment] = useState({ caseSummary: '', considerations: '', disposition: '', closing: '' });
  const [signer, setSigner] = useState({ signerName: '', signerRole: 'Advokat', signerEmail: '' });
  const [templateName, setTemplateName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCase = cases.find((item) => item.id === caseId);
  const availableTemplates = useMemo(
    () =>
      templates.filter(
        (template) =>
          template.documentType === type && (!selectedCase || template.jurisdiction === selectedCase.jurisdiction),
      ),
    [templates, type, selectedCase],
  );

  const refreshDocuments = useCallback(async (selectedCaseId = caseId) => {
    const result = await api.listDocuments({ caseId: selectedCaseId || undefined, limit: 100 });
    setDocuments(result.items);
  }, [caseId]);

  useEffect(() => {
    void Promise.all([api.listCases({ limit: 100 }), api.listDocumentTemplates()])
      .then(([caseResult, templateResult]) => {
        setCases(caseResult.items);
        setTemplates(templateResult);
        if (caseResult.items[0]) setCaseId(caseResult.items[0].id);
      })
      .catch((reason: unknown) => setError(errorMessage(reason)));
  }, []);

  useEffect(() => {
    void refreshDocuments(caseId).catch((reason: unknown) => setError(errorMessage(reason)));
  }, [caseId, refreshDocuments]);

  useEffect(() => {
    if (!availableTemplates.some((item) => item.id === templateId)) setTemplateId('');
  }, [availableTemplates, templateId]);

  const selectDocument = async (id: string) => {
    try {
      const detail = await api.getDocument(id);
      setSelected(detail);
      setEditTitle(detail.title);
      setContent(detail.content);
      setAiDraft('');
      setError('');
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  const generateAiDraft = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !aiInstruction.trim()) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api.generateAiDocumentDraft({
        documentType: selected.type,
        instruction: aiInstruction.trim(),
        sourceText: aiSourceText.trim() || undefined,
      });
      setAiDraft(result.draft);
      setNotice('Draf AI siap ditinjau. Hasil belum disimpan ke dokumen.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!caseId) {
      setError('Buat atau pilih perkara terlebih dahulu.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const powerOfAttorney =
        type === 'POWER_OF_ATTORNEY'
          ? {
              ...poa,
              principalNik: poa.principalNik || undefined,
              principalNpwp: poa.principalNpwp || undefined,
              attorneyNpwp: poa.attorneyNpwp || undefined,
              authority: poa.authority ? { uraian: poa.authority } : undefined,
            }
          : undefined;
      const judgmentData =
        type === 'JUDGMENT'
          ? { verdict, ...judgment, header: { pengadilan: selectedCase?.courtName ?? selectedCase?.title ?? '' } }
          : undefined;
      const created = await api.createDocument({
        caseId,
        templateId: templateId || undefined,
        type,
        title: title || `${DOCUMENT_LABELS[type]} — ${selectedCase?.caseNumber ?? ''}`,
        powerOfAttorney,
        judgment: judgmentData,
      });
      setTitle('');
      await refreshDocuments();
      await selectDocument(created.id);
      setNotice('Dokumen draf berhasil dibuat.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.updateDocument(selected.id, { title: editTitle, content, changeSummary: 'Disimpan dari editor dokumen' });
      await selectDocument(selected.id);
      await refreshDocuments();
      setNotice('Draf dan riwayat versinya berhasil disimpan.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      await api.submitDocument(selected.id);
      await selectDocument(selected.id);
      await refreshDocuments();
      setNotice('Dokumen dikirim dan dikunci dari perubahan langsung.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const requestSignature = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      await api.requestDocumentSignature(selected.id, {
        ...signer,
        signerEmail: signer.signerEmail || undefined,
      });
      await selectDocument(selected.id);
      setNotice('Permintaan tanda tangan tercatat. Provider tanda tangan resmi belum terhubung.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const saveTemplate = async () => {
    if (!selected || !selectedCase) return;
    setBusy(true);
    setError('');
    try {
      const payload = {
        name: templateName || selected.template?.name || selected.title,
        documentType: selected.type,
        jurisdiction: selectedCase.jurisdiction,
        content: selected.content,
      };
      if (selected.template) await api.createDocumentTemplateVersion(selected.template.id, payload);
      else await api.createDocumentTemplate(payload);
      setTemplates(await api.listDocumentTemplates());
      setTemplateName('');
      setNotice('Template baru berhasil disimpan sebagai versi terpisah.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const archiveTemplate = async (template: DocumentTemplate) => {
    if (!window.confirm(`Arsipkan template "${template.name}"?`)) return;
    try {
      await api.archiveDocumentTemplate(template.id);
      setTemplates(await api.listDocumentTemplates());
      setNotice('Template diarsipkan.');
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  const handlePrint = () => {
    if (!selected) return;
    try {
      printDocument({ ...selected, title: editTitle, content });
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  const documentTypeOptions = Object.entries(DOCUMENT_LABELS)
    .filter(([value]) => value !== 'JUDGMENT' || canCreateJudgment)
    .map(([value, label]) => ({ value: value as DocumentType, label }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Dokumen</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Buat dokumen perkara, kelola revisi, dan siapkan alur tanda tangan.
        </p>
      </div>

      {error && <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-600" role="alert">{error}</div>}
      {notice && <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-600" role="status">{notice}</div>}

      <Card>
        <h2 className="text-lg font-semibold mb-4">Dokumen Baru</h2>
        <form onSubmit={create} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Perkara *">
              <Select
                value={caseId}
                onChange={(e) => { setCaseId(e.target.value); setSelected(null); }}
                options={[{ value: '', label: 'Pilih perkara' }, ...cases.map((c) => ({ value: c.id, label: `${c.caseNumber} — ${c.title}` }))]}
                required
              />
            </Field>
            <Field label="Jenis Dokumen *">
              <Select
                value={type}
                onChange={(e) => setType(e.target.value as DocumentType)}
                options={documentTypeOptions}
              />
            </Field>
            <Field label="Judul">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Otomatis: ${DOCUMENT_LABELS[type]}`}
              />
            </Field>
            <Field label="Template">
              <Select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                options={[{ value: '', label: 'Template bawaan' }, ...availableTemplates.map((t) => ({ value: t.id, label: `${t.name} v${t.version}` }))]}
              />
            </Field>
          </div>

          {selectedCase && (
            <div className="text-sm text-[var(--muted)]">
              Jurisdiksi: {jurisdictionLabels[selectedCase.jurisdiction]}
            </div>
          )}

          {type === 'POWER_OF_ATTORNEY' && (
            <div className="space-y-4 pt-4 border-t border-[var(--border)]">
              <h3 className="font-medium">Data Surat Kuasa</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Jenis Kuasa">
                  <Select
                    value={poa.type}
                    onChange={(e) => setPoa({ ...poa, type: e.target.value as PowerOfAttorneyType })}
                    options={POA_TYPES}
                  />
                </Field>
                <Field label="Nama Pemberi Kuasa *">
                  <Input
                    value={poa.principalName}
                    onChange={(e) => setPoa({ ...poa, principalName: e.target.value })}
                    required
                  />
                </Field>
                <Field label="NIK Pemberi (16 digit)">
                  <Input
                    value={poa.principalNik}
                    onChange={(e) => setPoa({ ...poa, principalNik: e.target.value })}
                  />
                </Field>
                <Field label="NPWP Pemberi (opsional)">
                  <Input
                    value={poa.principalNpwp}
                    onChange={(e) => setPoa({ ...poa, principalNpwp: e.target.value })}
                  />
                </Field>
                <Field label="Nama Advokat *">
                  <Input
                    value={poa.attorneyName}
                    onChange={(e) => setPoa({ ...poa, attorneyName: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Nomor Izin Advokat *">
                  <Input
                    value={poa.attorneyLicenseNo}
                    onChange={(e) => setPoa({ ...poa, attorneyLicenseNo: e.target.value })}
                    required
                  />
                </Field>
                <Field label="NPWP Advokat (opsional)">
                  <Input
                    value={poa.attorneyNpwp}
                    onChange={(e) => setPoa({ ...poa, attorneyNpwp: e.target.value })}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label={`Kewenangan Kuasa ${poa.type === 'SPECIAL' && '(wajib untuk kuasa istimewa)'}`}>
                    <Textarea
                      value={poa.authority}
                      onChange={(e) => setPoa({ ...poa, authority: e.target.value })}
                      rows={3}
                    />
                  </Field>
                </div>
              </div>
              <p className="text-sm text-[var(--muted)]">
                Format NIK/NPWP dan nomor izin diperiksa secara sintaksis; keabsahan izin advokat belum diverifikasi ke PERADI.
              </p>
            </div>
          )}

          {type === 'JUDGMENT' && (
            <div className="space-y-4 pt-4 border-t border-[var(--border)]">
              <h3 className="font-medium">Struktur Putusan</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Jenis Amar">
                  <Select
                    value={verdict}
                    onChange={(e) => setVerdict(e.target.value as JudgmentVerdict)}
                    options={VERDICT_OPTIONS}
                  />
                </Field>
                <Field label="Duduk Perkara">
                  <Textarea
                    value={judgment.caseSummary}
                    onChange={(e) => setJudgment({ ...judgment, caseSummary: e.target.value })}
                    rows={3}
                    required
                    minLength={10}
                  />
                </Field>
                <Field label="Pertimbangan Hukum (wajib sitasi pasal F3)">
                  <Textarea
                    value={judgment.considerations}
                    onChange={(e) => setJudgment({ ...judgment, considerations: e.target.value })}
                    rows={5}
                    required
                    minLength={10}
                  />
                </Field>
                <Field label="Amar Putusan">
                  <Textarea
                    value={judgment.disposition}
                    onChange={(e) => setJudgment({ ...judgment, disposition: e.target.value })}
                    rows={3}
                    required
                    minLength={3}
                  />
                </Field>
                <Field label="Penutup">
                  <Textarea
                    value={judgment.closing}
                    onChange={(e) => setJudgment({ ...judgment, closing: e.target.value })}
                    rows={3}
                    required
                    minLength={3}
                  />
                </Field>
              </div>
              <p className="text-sm text-[var(--muted)]">
                Tautkan sitasi dengan jenis dokumen PUTUSAN melalui F3. Minimal satu sitasi PUTUSAN harus berstatus valid.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-[var(--border)]">
            <Button type="submit" disabled={busy || !caseId} size="lg">
              {busy ? 'Menyimpan…' : 'Buat Draf'}
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Daftar Dokumen</h2>
              <span className="text-sm text-[var(--muted)]">{documents.length}</span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {documents.length === 0 ? (
                <EmptyState title="Belum ada dokumen" description="Buat dokumen baru atau pilih perkara lain." />
              ) : (
                documents.map((document) => (
                  <button
                    key={document.id}
                    onClick={() => void selectDocument(document.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      selected?.id === document.id
                        ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30'
                        : 'border-[var(--border)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <div className="font-medium text-[var(--text)]">{document.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge tone={STATUS_TONES[document.status] || 'neutral'}>{document.status}</Badge>
                      <span className="text-xs text-[var(--muted)]">{DOCUMENT_LABELS[document.type]}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {selectedCase && (
              <div className="mt-6 pt-4 border-t border-[var(--border)]">
                <h3 className="font-medium mb-3">Template Perkara Ini</h3>
                {templates
                  .filter((item) => item.jurisdiction === selectedCase?.jurisdiction)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                      <span className="text-sm text-[var(--text)]">
                        {item.name} · {DOCUMENT_LABELS[item.documentType]} · v{item.version}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => void archiveTemplate(item)}>
                        Arsipkan
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!selected ? (
            <Card>
              <EmptyState title="Pilih Dokumen" description="Pilih dokumen di daftar untuk meninjau isi, revisi, dan tanda tangan." />
            </Card>
          ) : (
            <>
              <Card>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge tone={STATUS_TONES[selected.status] || 'neutral'}>{selected.status}</Badge>
                    </div>
                    <h2 className="text-xl font-semibold text-[var(--text)] truncate">{selected.title}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {selected.case?.caseNumber} · {DOCUMENT_LABELS[selected.type]}
                      {selected.template ? ` · ${selected.template.name} v${selected.template.version}` : ''}
                    </p>
                  </div>
                  <Button variant="ghost" onClick={handlePrint}>
                    Cetak / PDF
                  </Button>
                </div>

                {selected.status === 'DRAFT' ? (
                  <>
                    <div className="space-y-4">
                      <Field label="Judul">
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      </Field>
                      <Field label="Isi Dokumen">
                        <Textarea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          className="document-content font-mono"
                          rows={20}
                        />
                      </Field>

                      <Card className="bg-[var(--surface-2)]">
                        <form onSubmit={generateAiDraft} className="space-y-4">
                          <h3 className="font-medium">Asisten AI untuk Draf</h3>
                          <p className="text-sm text-[var(--muted)]">
                            Instruksi dan teks sumber yang Anda masukkan di bawah ini akan dikirim ke provider eksternal.
                            Isi dokumen dan data perkara tidak disertakan otomatis. Tinjau hasil sebelum digunakan.
                          </p>
                          <Field label="Instruksi">
                            <Textarea
                              id="ai-instruction"
                              value={aiInstruction}
                              onChange={(e) => setAiInstruction(e.target.value)}
                              rows={3}
                              maxLength={3000}
                              required
                            />
                          </Field>
                          <Field label="Teks Sumber Pilihan Anda (opsional)">
                            <Textarea
                              id="ai-source-text"
                              value={aiSourceText}
                              onChange={(e) => setAiSourceText(e.target.value)}
                              rows={4}
                              maxLength={20000}
                            />
                          </Field>
                          <Button variant="ghost" type="submit" disabled={busy || !aiInstruction.trim()}>
                            {busy ? 'Memproses…' : 'Buat Usulan Draf AI'}
                          </Button>
                          {aiDraft && (
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                              <h4 className="font-medium mb-2">Usulan Draf — Belum Disimpan</h4>
                              <pre className="whitespace-pre-wrap text-sm font-mono max-h-60 overflow-auto">{aiDraft}</pre>
                              <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setContent(aiDraft); setAiDraft(''); }}>
                                Gunakan di Editor
                              </Button>
                            </div>
                          )}
                        </form>
                      </Card>

                      <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--border)]">
                        <Button onClick={save} disabled={busy}>Simpan Revisi</Button>
                        <Button variant="ghost" onClick={submit} disabled={busy}>Kirim & Kunci</Button>
                        <Input
                          className="flex-1 min-w-[200px]"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder={selected.template ? 'Versi baru dari template terkait' : 'Nama template (opsional)'}
                          disabled={Boolean(selected.template)}
                        />
                        <Button variant="ghost" onClick={saveTemplate} disabled={busy}>Simpan Sebagai Template</Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <pre className="whitespace-pre-wrap font-mono text-sm bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)]">{selected.content}</pre>
                    <p className="text-sm text-[var(--muted)]">SHA-256: {selected.sha256 ?? 'belum tersedia'}</p>
                  </div>
                )}

                {selected.versions && selected.versions.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-[var(--border)]">
                    <h3 className="font-medium mb-4">Riwayat Versi</h3>
                    {selected.versions.length > 1 && (
                      <details className="mb-4">
                        <summary className="cursor-pointer font-medium text-[var(--accent)]">
                          Bandingkan v{selected.versions[1].version} → v{selected.versions[0].version}
                        </summary>
                        <div className="grid gap-4 sm:grid-cols-2 mt-4">
                          <div>
                            <p className="font-medium mb-2">Sebelumnya · v{selected.versions[1].version}</p>
                            <pre className="whitespace-pre-wrap text-sm font-mono bg-[var(--bg)] p-3 rounded border border-[var(--border)] max-h-60 overflow-auto">
                              {selected.versions[1].content}
                            </pre>
                          </div>
                          <div>
                            <p className="font-medium mb-2">Terbaru · v{selected.versions[0].version}</p>
                            <pre className="whitespace-pre-wrap text-sm font-mono bg-[var(--bg)] p-3 rounded border border-[var(--border)] max-h-60 overflow-auto">
                              {selected.versions[0].content}
                            </pre>
                          </div>
                        </div>
                      </details>
                    )}
                    {selected.versions.map((version) => (
                      <details key={version.id} className="mb-3">
                        <summary className="cursor-pointer text-sm text-[var(--text)]">
                          Versi {version.version} · {new Date(version.createdAt).toLocaleString('id-ID')} · {version.changeSummary}
                        </summary>
                        <pre className="whitespace-pre-wrap text-sm font-mono mt-2 bg-[var(--bg)] p-3 rounded border border-[var(--border)] max-h-60 overflow-auto">
                          {version.content}
                        </pre>
                      </details>
                    ))}
                  </div>
                )}

                {selected.status === 'SUBMITTED' && (
                  <form onSubmit={requestSignature} className="mt-6 pt-6 border-t border-[var(--border)] space-y-4">
                    <h3 className="font-medium">Permintaan Tanda Tangan</h3>
                    <p className="text-sm text-[var(--muted)]">
                      Permintaan disimpan sebagai pending. E-signature, e-meterai, dan verifikasi BSrE membutuhkan provider resmi.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Nama Penanda Tangan *">
                        <Input
                          value={signer.signerName}
                          onChange={(e) => setSigner({ ...signer, signerName: e.target.value })}
                          required
                        />
                      </Field>
                      <Field label="Peran *">
                        <Input
                          value={signer.signerRole}
                          onChange={(e) => setSigner({ ...signer, signerRole: e.target.value })}
                          required
                        />
                      </Field>
                    </div>
                    <Button variant="ghost" disabled={busy} type="submit">
                      Catat Permintaan
                    </Button>
                    {selected.signatures?.map((item) => (
                      <p key={item.id} className="text-sm text-[var(--muted)]">
                        {item.signerName} · {item.status} · provider {item.metadata?.providerStatus ?? 'belum terhubung'}
                      </p>
                    ))}
                  </form>
                )}

                {selected.type === 'JUDGMENT' && selected.judgment && (
                  <p className="mt-4 text-sm text-[var(--muted)]">Amar: {VERDICT_LABELS[selected.judgment.verdict]}</p>
                )}
                {selected.type === 'POWER_OF_ATTORNEY' && selected.powerOfAttorney && (
                  <p className="mt-4 text-sm text-[var(--muted)]">
                    {selected.powerOfAttorney.type} · {selected.powerOfAttorney.principalName} →{' '}
                    {selected.powerOfAttorney.attorneyName} · izin {selected.powerOfAttorney.attorneyLicenseNo}
                  </p>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}