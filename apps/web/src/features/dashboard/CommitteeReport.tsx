import { TriangleAlert, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";

const pageSource = (page: number) => `/api/committee-reports/erp-development-2026-09-02/pages/${page}`;

export function CommitteeReport() {
  const { language } = useI18n();
  const ar = language === "ar";
  const [page, setPage] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [imageFailed, setImageFailed] = useState(false);
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useEffect(() => { setHeaderSlot(document.getElementById("committee-header-alert")); }, []);
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const title = ar ? "مستجدات تطوير وتنفيذ منظومة ERP" : "ERP Development & Implementation Update";
  const pageLabel = (value: number) => ar ? `الصفحة ${value} من 2` : `Page ${value} of 2`;

  useEffect(() => {
    if (page === null) return;
    const node = dialog.current;
    node?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      node?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [page !== null]);

  function selectPage(value: number) {
    setPage(value);
    setZoom(1);
    setImageFailed(false);
    viewport.current?.scrollTo(0, 0);
  }

  return <>
    {headerSlot && createPortal(<button type="button" className="committee-header-alert" onClick={() => selectPage(1)}
      aria-label={ar ? "تم استلام موافقة المؤسسة الوطنية للنفط — عرض التقرير" : "NOC approval received — view report"}>
      <span className="committee-header-alert-icon"><TriangleAlert size={24} strokeWidth={2.5} aria-hidden="true" /></span>
      <span><strong>{ar ? "تم استلام موافقة المؤسسة الوطنية للنفط" : "NOC approval received"}</strong><small>{ar ? "تنبيه هام · اضغط لعرض التقرير" : "IMPORTANT NOTICE · Click to view report"}</small></span>
      <ChevronRight size={17} aria-hidden="true" />
    </button>, headerSlot)}
    <dialog ref={dialog} dir={ar ? "rtl" : "ltr"} className="committee-report-dialog" aria-labelledby="committee-report-dialog-title"
      onCancel={() => setPage(null)} onClick={(event) => { if (event.target === event.currentTarget) setPage(null); }}>
      {page !== null && <div className="committee-report-viewer">
        <header>
          <div><h2 id="committee-report-dialog-title">{title}</h2><p>{pageLabel(page)} · 02 / 09 / 2026</p></div>
          <button type="button" className="committee-report-icon-button" aria-label={ar ? "إغلاق التقرير" : "Close report"} onClick={() => setPage(null)} autoFocus><X size={22} /></button>
        </header>
        <nav className="committee-report-viewer-toolbar" aria-label={ar ? "أدوات التقرير" : "Report controls"}>
          <div>
            <button type="button" disabled={page === 1} onClick={() => selectPage(page - 1)} aria-label={ar ? "الصفحة السابقة" : "Previous page"}><ChevronLeft size={18} /></button>
            <span aria-live="polite">{pageLabel(page)}</span>
            <button type="button" disabled={page === 2} onClick={() => selectPage(page + 1)} aria-label={ar ? "الصفحة التالية" : "Next page"}><ChevronRight size={18} /></button>
          </div>
          <div>
            <button type="button" disabled={zoom <= 1} onClick={() => setZoom((value) => value - .25)} aria-label={ar ? "تصغير" : "Zoom out"}><ZoomOut size={18} /></button>
            <span aria-live="polite">{Math.round(zoom * 100)}%</span>
            <button type="button" disabled={zoom >= 2} onClick={() => setZoom((value) => value + .25)} aria-label={ar ? "تكبير" : "Zoom in"}><ZoomIn size={18} /></button>
          </div>
        </nav>
        <div className="committee-report-viewport" ref={viewport}>
          {imageFailed ? <p role="alert">{ar ? "تعذر تحميل الصفحة. أغلق التقرير وحاول مرة أخرى." : "This page could not be loaded. Close the report and try again."}</p> :
            <img key={page} src={pageSource(page)} alt={`${title} — ${pageLabel(page)}`} style={{ width: `${zoom * 100}%` }} onError={() => setImageFailed(true)} />}
        </div>
      </div>}
    </dialog>
  </>;
}
