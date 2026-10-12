import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  api,
  citationDocumentLabels,
  citationValidationLabels,
  formatRegulationIdentity,
} from '../api';
import type {
  ArticleCatalogItem,
  CitationDocumentType,
  CitationList,
  LegalBasis,
} from '../types';

const emptyForm = {
  articleId: '',
  quote: '',
  documentType: 'GUGATAN' as CitationDocumentType,
  documentTitle: '',
  articleNumber: '',
  regulationSlug: '',
};

export default function CitationPanel({ caseId }: { caseId: string }) {
  const [citations, setCitations] = useState<CitationList | null>(null);
  const [basis, setBasis] = useState<LegalBasis | null>(null);
  const [candidates, setCandidates] = useState<ArticleCatalogItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    void Promise.all([api.listCitations(caseId), api.legalBasis(caseId)])
      .then(([list, legalBasis]) => {
        setCitations(list);
        setBasis(legalBasis);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat sitasi'));
  };

  useEffect(load, [caseId]);

  const searchArticle = async () => {
    if (!form.regulationSlug || !form.articleNumber) {
      setCandidates([]);
      return;
    }
    try {
      const res = await api.listArticles({
        regulationSlug: form.regulationSlug,
        articleNumber: form.articleNumber,
        limit: 10,
      });
      setCandidates(res.items);
    } catch {
      setCandidates([]);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.articleId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const created = (await api.createCitation(caseId, {
        articleId: form.articleId,
        quote: form.quote || undefined,
        documentType: form.documentType,
        documentTitle: form.documentTitle || undefined,
      })) as { validationStatus: string; validationMessage: string | null };
      setNotice(
        created.validationStatus === 'WARNING'
          ? `Sitasi ditambahkan dengan catatan: ${created.validationMessage}`
          : 'Sitasi ditambahkan.',
      );
      setForm(emptyForm);
      setCandidates([]);
      load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menambahkan sitasi';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const revalidate = async () => {
    setBusy(true);
    try {
      const res = await api.revalidateCitations(caseId);
      setCitations(res.items);
      setNotice(`Validasi ulang selesai: ${res.revalidated} sitasi, ${res.flagged} perlu perhatian.`);
      void api.legalBasis(caseId).then(setBasis);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Validasi ulang gagal');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (citationId: string) => {
    await api.deleteCitation(caseId, citationId);
    load();
  };

  const summary = citations?.summary;

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>Dasar Hukum &amp; Sitasi Pasal</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => void revalidate()} disabled={busy}>
            Validasi ulang
          </button>
        </div>

        {summary && (
          <p className="muted" style={{ marginTop: '0.5rem' }}>
            Total {summary.total} sitasi · {summary.valid} sesuai · {summary.warning} perlu perhatian ·{' '}
            {summary.invalid} tidak valid
          </p>
        )}

        {basis && basis.flagged.length > 0 && (
          <table className="table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Pasal</th>
                <th>Status</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {basis.flagged.map((flag) => (
                <tr key={flag.citationId}>
                  <td>{flag.label}</td>
                  <td>
                    <span className={`badge badge-${flag.status}`}>
                      {citationValidationLabels[flag.status]}
                    </span>
                  </td>
                  <td>{flag.message ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {basis && basis.regulations.length > 0 && (
          <table className="table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Peraturan</th>
                <th>Pasal</th>
                <th>Status Worst</th>
              </tr>
            </thead>
            <tbody>
              {basis.regulations.map((group) => (
                <tr key={group.regulationId}>
                  <td>
                    <Link to={`/peraturan/${group.regulationSlug}`}>{group.label}</Link>
                  </td>
                  <td>
                    {group.articles.map((a) => (
                      <div key={a.id}>{a.label}</div>
                    ))}
                  </td>
                  <td>
                    <span className={`badge badge-${group.worstStatus}`}>
                      {citationValidationLabels[group.worstStatus]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form onSubmit={submit} style={{ marginTop: '1rem' }}>
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 120px 1fr' }}>
            <div className="field">
              <label>Slug peraturan</label>
              <input
                className="input"
                value={form.regulationSlug}
                onChange={(e) => setForm({ ...form, regulationSlug: e.target.value })}
                onBlur={() => void searchArticle()}
                placeholder="Mis. uu-1-2024-contoh"
              />
            </div>
            <div className="field">
              <label>Nomor pasal</label>
              <input
                className="input"
                value={form.articleNumber}
                onChange={(e) => setForm({ ...form, articleNumber: e.target.value })}
                onBlur={() => void searchArticle()}
                placeholder="1"
              />
            </div>
            <div className="field">
              <label>Dokumen</label>
              <select
                className="select"
                value={form.documentType}
                onChange={(e) =>
                  setForm({ ...form, documentType: e.target.value as CitationDocumentType })
                }
              >
                {Object.entries(citationDocumentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {candidates.length > 0 && (
            <table className="table" style={{ marginTop: '0.75rem' }}>
              <thead>
                <tr>
                  <th>Pasal</th>
                  <th>Status</th>
                  <th>Pilih</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate.id}>
                    <td>{candidate.unitKey}</td>
                    <td>
                      <span className={`badge badge-${candidate.applicability.state}`}>
                        {candidate.applicability.label}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setForm({ ...form, articleId: candidate.id })}
                      >
                        Pilih
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="grid-2" style={{ marginTop: '0.75rem' }}>
            <div className="field">
              <label>Judul dokumen (opsional)</label>
              <input
                className="input"
                value={form.documentTitle}
                onChange={(e) => setForm({ ...form, documentTitle: e.target.value })}
                placeholder="Mis. Gugatan Principal"
              />
            </div>
            <div className="field">
              <label>Kutipan (opsional)</label>
              <input
                className="input"
                value={form.quote}
                onChange={(e) => setForm({ ...form, quote: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <button className="btn" type="submit" disabled={busy || !form.articleId}>
              {busy ? 'Menyimpan...' : 'Tambah Sitasi'}
            </button>
            {!form.articleId && (
              <span className="muted" style={{ marginLeft: '0.5rem' }}>
                Pilih pasal terlebih dahulu.
              </span>
            )}
          </div>
        </form>

        {notice && <p className="muted" style={{ marginTop: '0.75rem' }}>{notice}</p>}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h3>Daftar Sitasi</h3>
        {citations && citations.items.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Dasar Hukum</th>
                <th>Dokumen</th>
                <th>Kutipan</th>
                <th>Validasi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {citations.items.map((citation) => (
                <tr key={citation.id}>
                  <td>
                    <Link to={`/peraturan/${citation.article.regulation.slug}`}>
                      {formatRegulationIdentity(
                        citation.article.regulation.type,
                        citation.article.regulation.number,
                        citation.article.regulation.year,
                      )}
                    </Link>
                    <div>{citation.article.unitKey}</div>
                  </td>
                  <td>
                    {citation.documentType ? citationDocumentLabels[citation.documentType] : '-'}
                    {citation.documentTitle ? ` · ${citation.documentTitle}` : ''}
                  </td>
                  <td>{citation.quote ?? '-'}</td>
                  <td>
                    <span className={`badge badge-${citation.validationStatus}`}>
                      {citationValidationLabels[citation.validationStatus]}
                    </span>
                    {citation.validationMessage && (
                      <div className="muted" style={{ fontSize: '0.8rem' }}>
                        {citation.validationMessage}
                      </div>
                    )}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => void remove(citation.id)}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Belum ada sitasi pada perkara ini.</p>
        )}
      </div>
    </div>
  );
}