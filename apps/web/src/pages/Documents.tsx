import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, jurisdictionLabels } from '../api';
import { useAuth } from '../auth/AuthContext';
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Terjadi kesalahan. Coba lagi.';
}

function printDocument(document: LegalDocument): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('Popup diblokir browser. Izinkan popup untuk mencetak dokumen.');
  printWindow.opener = null;
  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
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

  const refreshDocuments = async (selectedCaseId = caseId) => {
    const result = await api.listDocuments({ caseId: selectedCaseId || undefined, limit: 100 });
    setDocuments(result.items);
  };

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
  }, [caseId]);

  useEffect(() => {
    if (!availableTemplates.some((item) => item.id === templateId)) setTemplateId('');
  }, [availableTemplates, templateId]);

  const selectDocument = async (id: string) => {
    try {
      const detail = await api.getDocument(id);
      setSelected(detail);
      setEditTitle(detail.title);
      setContent(detail.content);
      setError('');
    } catch (reason) {
      setError(errorMessage(reason));
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

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Dokumen</h1>
          <p className="muted">Buat dokumen perkara, kelola revisi, dan siapkan alur tanda tangan.</p>
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      <section className="card document-create">
        <h2>Dokumen baru</h2>
        <form onSubmit={(event) => void create(event)} className="document-form">
          <div className="field">
            <label htmlFor="document-case">Perkara</label>
            <select id="document-case" className="select" value={caseId} onChange={(event) => { setCaseId(event.target.value); setSelected(null); }} required>
              <option value="">Pilih perkara</option>
              {cases.map((item) => <option key={item.id} value={item.id}>{item.caseNumber} — {item.title}</option>)}
            </select>
            {selectedCase && <span className="muted">{jurisdictionLabels[selectedCase.jurisdiction]}</span>}
          </div>
          <div className="field">
            <label htmlFor="document-type">Jenis dokumen</label>
            <select id="document-type" className="select" value={type} onChange={(event) => setType(event.target.value as DocumentType)}>
              {Object.entries(DOCUMENT_LABELS).filter(([value]) => value !== 'JUDGMENT' || canCreateJudgment).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="document-title">Judul</label>
            <input id="document-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`Otomatis: ${DOCUMENT_LABELS[type]}`} />
          </div>
          <div className="field">
            <label htmlFor="document-template">Template</label>
            <select id="document-template" className="select" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
              <option value="">Template bawaan</option>
              {availableTemplates.map((item) => <option key={item.id} value={item.id}>{item.name} v{item.version}</option>)}
            </select>
          </div>
          {type === 'POWER_OF_ATTORNEY' && (
            <div className="document-fields">
              <h3>Data Surat Kuasa</h3>
              <div className="grid-2">
                <div className="field"><label>Jenis kuasa</label><select className="select" value={poa.type} onChange={(e) => setPoa({ ...poa, type: e.target.value as PowerOfAttorneyType })}><option value="SPECIFIC">Khusus</option><option value="GENERAL">Umum</option><option value="SPECIAL">Istimewa</option></select></div>
                <div className="field"><label>Nama pemberi kuasa</label><input className="input" required value={poa.principalName} onChange={(e) => setPoa({ ...poa, principalName: e.target.value })} /></div>
                <div className="field"><label>NIK pemberi (16 digit)</label><input className="input" value={poa.principalNik} onChange={(e) => setPoa({ ...poa, principalNik: e.target.value })} /></div>
                <div className="field"><label>NPWP pemberi (opsional)</label><input className="input" value={poa.principalNpwp} onChange={(e) => setPoa({ ...poa, principalNpwp: e.target.value })} /></div>
                <div className="field"><label>Nama advokat</label><input className="input" required value={poa.attorneyName} onChange={(e) => setPoa({ ...poa, attorneyName: e.target.value })} /></div>
                <div className="field"><label>Nomor izin advokat</label><input className="input" required value={poa.attorneyLicenseNo} onChange={(e) => setPoa({ ...poa, attorneyLicenseNo: e.target.value })} /></div>
                <div className="field"><label>NPWP advokat (opsional)</label><input className="input" value={poa.attorneyNpwp} onChange={(e) => setPoa({ ...poa, attorneyNpwp: e.target.value })} /></div>
                <div className="field"><label>Kewenangan kuasa {poa.type === 'SPECIAL' && '(wajib untuk kuasa istimewa)'}</label><textarea className="input" value={poa.authority} onChange={(e) => setPoa({ ...poa, authority: e.target.value })} rows={3} /></div>
              </div>
              <p className="muted">Format NIK/NPWP dan nomor izin diperiksa secara sintaksis; keabsahan izin advokat belum diverifikasi ke PERADI.</p>
            </div>
          )}
          {type === 'JUDGMENT' && (
            <div className="document-fields">
              <h3>Struktur Putusan</h3>
              <div className="grid-2">
                <div className="field"><label>Jenis amar</label><select className="select" value={verdict} onChange={(e) => setVerdict(e.target.value as JudgmentVerdict)}>{Object.entries(VERDICT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                {([
                  ['caseSummary', 'Duduk perkara'],
                  ['considerations', 'Pertimbangan hukum (wajib sitasi pasal F3)'],
                  ['disposition', 'Amar putusan'],
                  ['closing', 'Penutup'],
                ] as const).map(([key, label]) => <div className="field" key={key}><label>{label}</label><textarea className="input" rows={key === 'considerations' ? 5 : 3} required minLength={key === 'closing' || key === 'disposition' ? 3 : 10} value={judgment[key]} onChange={(e) => setJudgment({ ...judgment, [key]: e.target.value })} /></div>)}
              </div>
              <p className="muted">Tautkan sitasi dengan jenis dokumen PUTUSAN melalui F3. Minimal satu sitasi PUTUSAN harus berstatus valid.</p>
            </div>
          )}
          <button className="btn" type="submit" disabled={busy || !caseId}>{busy ? 'Menyimpan…' : 'Buat draf'}</button>
        </form>
      </section>

      <div className="document-workspace">
        <section className="card">
          <div className="document-list-heading"><h2>Daftar dokumen</h2><span className="muted">{documents.length}</span></div>
          <div className="document-list">
            {documents.length === 0 ? <p className="muted">Belum ada dokumen untuk perkara ini.</p> : documents.map((document) => (
              <button className={`document-list-item${selected?.id === document.id ? ' is-selected' : ''}`} key={document.id} onClick={() => void selectDocument(document.id)}>
                <strong>{document.title}</strong><span>{DOCUMENT_LABELS[document.type]}</span><span className={`badge badge-${document.status}`}>{document.status}</span>
              </button>
            ))}
          </div>
          <h3>Template perkara ini</h3>
          {templates.filter((item) => item.jurisdiction === selectedCase?.jurisdiction).map((item) => (
            <div className="template-row" key={item.id}><span>{item.name} · {DOCUMENT_LABELS[item.documentType]} · v{item.version}</span><button className="btn btn-ghost btn-sm" onClick={() => void archiveTemplate(item)}>Arsipkan</button></div>
          ))}
        </section>

        <section className="card document-editor">
          {!selected ? <div className="empty-state"><h2>Pilih dokumen</h2><p className="muted">Pilih dokumen di daftar untuk meninjau isi, revisi, dan tanda tangan.</p></div> : (
            <>
              <div className="document-editor-heading"><div><span className={`badge badge-${selected.status}`}>{selected.status}</span><h2>{selected.title}</h2><p className="muted">{selected.case?.caseNumber} · {DOCUMENT_LABELS[selected.type]}{selected.template ? ` · ${selected.template.name} v${selected.template.version}` : ''}</p></div><button className="btn btn-ghost" onClick={() => { try { printDocument({ ...selected, title: editTitle, content }); } catch (reason) { setError(errorMessage(reason)); } }}>Cetak / PDF</button></div>
              {selected.status === 'DRAFT' ? (
                <>
                  <div className="field"><label>Judul</label><input className="input" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /></div>
                  <div className="field"><label>Isi dokumen</label><textarea className="input document-content" value={content} onChange={(event) => setContent(event.target.value)} /></div>
                  <div className="document-actions">
                    <button className="btn" onClick={() => void save()} disabled={busy}>Simpan revisi</button>
                    <button className="btn btn-ghost" onClick={() => void submit()} disabled={busy}>Kirim & kunci</button>
                    <input className="input template-name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder={selected.template ? 'Versi baru dari template terkait' : 'Nama template (opsional)'} disabled={Boolean(selected.template)} />
                    <button className="btn btn-ghost" onClick={() => void saveTemplate()} disabled={busy}>Simpan sebagai template</button>
                  </div>
                </>
              ) : <div className="document-readonly"><pre>{selected.content}</pre><p className="muted">SHA-256: {selected.sha256 ?? 'belum tersedia'}</p></div>}
              {selected.versions && selected.versions.length > 0 && <div className="version-history"><h3>Riwayat versi</h3>{selected.versions.length > 1 && <details><summary>Bandingkan v{selected.versions[1].version} → v{selected.versions[0].version}</summary><div className="version-comparison"><div><strong>Sebelumnya · v{selected.versions[1].version}</strong><pre>{selected.versions[1].content}</pre></div><div><strong>Terbaru · v{selected.versions[0].version}</strong><pre>{selected.versions[0].content}</pre></div></div></details>}{selected.versions.map((version) => <details key={version.id}><summary>Versi {version.version} · {new Date(version.createdAt).toLocaleString('id-ID')} · {version.changeSummary}</summary><pre>{version.content}</pre></details>)}</div>}
              {selected.status === 'SUBMITTED' && <form className="signature-request" onSubmit={(event) => void requestSignature(event)}><h3>Permintaan tanda tangan</h3><p className="muted">Permintaan disimpan sebagai pending. E-signature, e-meterai, dan verifikasi BSrE membutuhkan provider resmi.</p><div className="grid-2"><div className="field"><label>Nama penanda tangan</label><input className="input" value={signer.signerName} onChange={(e) => setSigner({ ...signer, signerName: e.target.value })} required /></div><div className="field"><label>Peran</label><input className="input" value={signer.signerRole} onChange={(e) => setSigner({ ...signer, signerRole: e.target.value })} required /></div></div><button className="btn btn-ghost" disabled={busy}>Catat permintaan</button>{selected.signatures?.map((item) => <p key={item.id} className="muted">{item.signerName} · {item.status} · provider {item.metadata?.providerStatus ?? 'belum terhubung'}</p>)}</form>}
              {selected.type === 'JUDGMENT' && selected.judgment && <p className="muted">Amar: {VERDICT_LABELS[selected.judgment.verdict]}</p>}
              {selected.type === 'POWER_OF_ATTORNEY' && selected.powerOfAttorney && <p className="muted">{selected.powerOfAttorney.type} · {selected.powerOfAttorney.principalName} → {selected.powerOfAttorney.attorneyName} · izin {selected.powerOfAttorney.attorneyLicenseNo}</p>}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
