import { Fragment } from 'react';

const MARK_OPEN = '<mark>';
const MARK_CLOSE = '</mark>';

/**
 * Menampilkan cuplikan hasil ts_headline tanpa memakai dangerouslySetInnerHTML.
 * Postgres tidak meng-escape isi kolom sumber, sehingga markup harus
 * di-render sebagai elemen React, bukan HTML mentah.
 */
export default function HighlightSnippet({ text }: { text: string }) {
  if (!text) return null;

  const parts = text.split(new RegExp(`(${MARK_OPEN}|${MARK_CLOSE})`, 'g'));
  let highlighted = false;

  return (
    <>
      {parts.map((part, index) => {
        if (part === MARK_OPEN) {
          highlighted = true;
          return null;
        }
        if (part === MARK_CLOSE) {
          highlighted = false;
          return null;
        }
        return highlighted ? <mark key={index}>{part}</mark> : <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}