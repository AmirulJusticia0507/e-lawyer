import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ApiError,
  api,
  formatRegulationIdentity,
  jurisdictionLabels,
  legalSourceStatusLabels,
  regulationTypeLabels,
} from '../api';
import type { ArticleCatalogItem, ArticleCrossReference, ArticleLookup, RegulationDetail } from '../types';

const today = () => new Date().toISOString().slice(0, 10);

export default function RegulationDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const focusArticleId = searchParams.get('pasal');

  const [data, setData] = useState<RegulationDetail | null>(null);
  const [articles, setArticles] = useState<ArticleCatalogItem[]>([]);
  const [crossRef, setCrossRef] = useState<ArticleCrossReference | null>(null);
  const [at, setAt] = useState(today());
  const [error, setError] = useState<string | null>(null);

  const [lookup, setLookup] = useState({ articleNumber: '', paragraphNumber: '' });
  const [lookupResult, setLookupResult] = useState<ArticleLookup | null>(null);

  useEffect(() => {
    if (!slug) return;
    void Promise.all([
      api.getRegulation(slug, at),
      api.listArticlesInRegulation(slug, { limit: 100, at }),
    ])
      .then(([regulation, articleList]) => {
        setData(regulation);
        setArticles(articleList.items);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat peraturan'));
  }, [slug, at]);

  useEffect(() => {
    if (!focusArticleId) return;
    void api
      .crossReference(focusArticleId)
      .then(setCrossRef)
      .catch(() => setCrossRef(null));
  }, [focusArticleId]);

  const onLookup = async (e: FormEvent) => {
    e.preventDefault();
    if (!slug || !lookup.articleNumber) return;
    try {
      setLookupResult(
        await api.lookupArticle({
          regulationSlug: slug,
          articleNumber: lookup.articleNumber,
          paragraphNumber: lookup.paragraphNumber || undefined,
          at,
        }),
      );
      setError(null);
    } catch (err) {
      setLookupResult(null);
      setError(err instanceof ApiError ? err.message : 'Pasal tidak ditemukan');
    }
  };

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Memuat...</p>;

  return (
    <div>
      <p>
        <Link to="/peraturan">← Kembali ke daftar peraturan</Link>
      </p>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ margin: '0.5rem 0' }}>{data.title}</h1>
        <span className={`badge badge-${data.applicability.state}`}>{data.applicability.label}</span>
      </div>
      <p className="muted">
        {formatRegulationIdentity(data.type, data.number, data.year)}
        {data.jurisdiction ? ` · ${jurisdictionLabels[data.jurisdiction]}` : ''} · {data._count.articles} pasal
        {data.sourceUrl ? (
          <>
            {' · '}
            <a href={data.sourceUrl} target="_blank" rel="noreferrer">
              sumber resmi
            </a>
          </>
        ) : null}
      </p>

      <div className="card">
        <h3>Metadata</h3>
        <div className="grid-2">
          <div className="field">
            <label>Jenis</label>
            <div>{regulationTypeLabels[data.type]}</div>
          </div>
          <div className="field">
            <label>Status tercatat</label>
            <div>{legalSourceStatusLabels[data.status]}</div>
          </div>
          <div className="field">
            <label>Berlaku mulai</label>
            <div>{data.effectiveFrom ? data.effectiveFrom.slice(0, 10) : '-'}</div>
          </div>
          <div className="field">
            <label>Berlaku sampai</label>
            <div>{data.effectiveUntil ? data.effectiveUntil.slice(0, 10) : '-'}</div>
          </div>
          <div className="field">
            <label>Status pada tanggal acuan</label>
            <div>{legalSourceStatusLabels[data.statusAt]}</div>
          </div>
          <div className="field">
            <label>Tanggal acuan</label>
            <input
              className="input"
              type="date"
              value={at}
              onChange={(e) => setAt(e.target.value)}
            />
          </div>
        </div>
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          {data.applicability.message}
        </p>
      </div>

      <div className="card">
        <h3>Riwayat Versi</h3>
        {data.timeline.length === 0 ? (
          <p className="muted">Belum ada catatan versi.</p>
        ) : (
          <div className="timeline">
            {data.timeline.map((event, index) => (
              <div key={`${event.date}-${index}`} className="timeline-item">
                <span className={`badge badge-${event.type}`}>{event.label}</span>
                <div className="muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  {event.date ?? 'tanggal tidak diketahui'}
                </div>
                {event.note && <p className="muted" style={{ margin: '0.25rem 0' }}>{event.note}</p>}
              </div>
            ))}
          </div>
        )}

        {data.amendmentsReceived.length > 0 && (
          <table className="table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Diubah oleh</th>
                <th>Jenis</th>
                <th>Efektif</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {data.amendmentsReceived.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/peraturan/${a.amendingRegulation?.slug}`}>
                      {a.amendingRegulation?.title ?? '-'}
                    </Link>
                  </td>
                  <td>{a.type}</td>
                  <td>{a.effectiveAt ? a.effectiveAt.slice(0, 10) : '-'}</td>
                  <td>{a.note ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Lookup Pasal</h3>
        <form onSubmit={onLookup} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ maxWidth: 120 }}
            placeholder="Nomor"
            value={lookup.articleNumber}
            onChange={(e) => setLookup({ ...lookup, articleNumber: e.target.value })}
            required
          />
          <input
            className="input"
            style={{ maxWidth: 120 }}
            placeholder="Ayat (opsional)"
            value={lookup.paragraphNumber}
            onChange={(e) => setLookup({ ...lookup, paragraphNumber: e.target.value })}
          />
          <button className="btn" type="submit">
            Cari pasal
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        {lookupResult && (
          <div style={{ marginTop: '1rem' }}>
            <span className={`badge badge-${lookupResult.selected.applicability.state}`}>
              {lookupResult.selected.applicability.label}
            </span>
            <p style={{ marginTop: '0.5rem' }}>{lookupResult.selected.content}</p>
            {lookupResult.matches.length > 1 && (
              <p className="muted">
                Ditemukan {lookupResult.matches.length} versi pasal; yang ditampilkan adalah versi yang
                berlaku pada {at}.
              </p>
            )}
          </div>
        )}
      </div>

      {crossRef && (
        <div className="card">
          <h3>Cross-reference · {crossRef.article.unitKey}</h3>
          <div className="grid-2">
            <div className="field">
              <label>Diubah oleh ({crossRef.amendments.length})</label>
              <ul>
                {crossRef.amendments.length === 0 && <li className="muted">-</li>}
                {crossRef.amendments.map((a) => (
                  <li key={a.id}>
                    <Link to={`/peraturan/${a.amendingRegulation.slug}`}>{a.amendingRegulation.title}</Link>{' '}
                    ({a.type}, {a.effectiveAt ? a.effectiveAt.slice(0, 10) : '-'})
                  </li>
                ))}
              </ul>
            </div>
            <div className="field">
              <label>Dikutip dalam ({crossRef.citedIn.length})</label>
              <ul>
                {crossRef.citedIn.length === 0 && <li className="muted">-</li>}
                {crossRef.citedIn.map((c) => (
                  <li key={c.id}>
                    <Link to={`/perkara/${c.case.id}`}>{c.case.caseNumber}</Link> — {c.case.title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {crossRef.coRegulations.length > 0 && (
            <table className="table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Pasal serupa</th>
                  <th>Peraturan</th>
                </tr>
              </thead>
              <tbody>
                {crossRef.coRegulations.map((c) => (
                  <tr key={c.id}>
                    <td>{c.unitKey}</td>
                    <td>
                      <Link to={`/peraturan/${c.regulation.slug}`}>{c.regulation.title}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="card">
        <h3>Katalog Pasal ({articles.length})</h3>
        {articles.length === 0 ? (
          <p className="muted">Belum ada pasal terkurasi untuk peraturan ini.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Pasal</th>
                <th>Heading</th>
                <th>Isi</th>
                <th>Status</th>
                <th>Berlaku</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr
                  key={article.id}
                  style={focusArticleId === article.id ? { outline: '2px solid currentColor' } : undefined}
                >
                  <td>
                    {article.unitKey}
                    {article.paragraphNumber ? ` (ayat ${article.paragraphNumber})` : ''}
                  </td>
                  <td>{article.heading ?? '-'}</td>
                  <td>{article.content}</td>
                  <td>{legalSourceStatusLabels[article.status]}</td>
                  <td>
                    <span className={`badge badge-${article.applicability.state}`}>
                      {article.applicability.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}