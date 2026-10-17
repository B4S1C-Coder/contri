import { DOCUMENT_LABELS } from '../../background/reports/documents';
import { Ext, Loading, Note } from './common';
import { useRequest } from './hooks';

export function GuideTab({ repo }: { repo: string }) {
  const result = useRequest('documents', { repo });
  return (
    <section className="cc-section">
      <span className="cc-eyebrow">HOW THIS PROJECT WORKS</span>
      <h2>Read before you start.</h2>
      <p>File presence does not guarantee a welcoming or up-to-date project, but missing guides are worth noticing.</p>
      {result.loading && <Loading>Reading community files…</Loading>}
      {result.error && <Note onRetry={() => result.reload(true)}>{result.error}</Note>}
      {result.value?.health != null && (
        <p className="cc-caption">GitHub community profile: {result.value.health}% complete.</p>
      )}
      {result.value &&
        (Object.keys(DOCUMENT_LABELS) as Array<keyof typeof DOCUMENT_LABELS>).map((key) => {
          const url = result.value?.files[key];
          return (
            <div className="cc-row" key={key}>
              {url ? (
                <Ext href={url}>{DOCUMENT_LABELS[key]}</Ext>
              ) : (
                <>
                  <strong>{DOCUMENT_LABELS[key]}</strong>
                  <small>Not detected. Check the repository directly.</small>
                </>
              )}
            </div>
          );
        })}
      {result.value?.note && <Note tone="info">{result.value.note}</Note>}
    </section>
  );
}
