import React, { useMemo } from 'react';
import { BadgeDollarSign, Check, ChevronDown, Link2, Pipette, ShieldCheck, SlidersHorizontal, Tags } from 'lucide-react';

export const defaultProductFilters = {
  brand: 'all',
  status: 'all',
  priceMin: null,
  priceMax: null,
  color: 'all',
  material: 'all',
};

export function filterAndSortProducts(products, filters, sortMode) {
  const filtered = products.filter((product) => {
    if (filters.brand !== 'all' && product.brand !== filters.brand) {
      return false;
    }

    if (filters.status === 'new' && !product.isNew) {
      return false;
    }

    if (filters.status === 'sale' && !product.isSale) {
      return false;
    }

    if (filters.status === 'inStock' && !product.inStock) {
      return false;
    }

    const minPrice = filters.priceMin ?? 0;
    const maxPrice = filters.priceMax ?? Infinity;
    if (product.rawPrice < minPrice || product.rawPrice > maxPrice) {
      return false;
    }

    if (filters.color !== 'all' && product.colorTone !== filters.color) {
      return false;
    }

    if (filters.material !== 'all' && product.materialType !== filters.material) {
      return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    if (sortMode === 'priceAsc') {
      return a.rawPrice - b.rawPrice;
    }

    if (sortMode === 'priceDesc') {
      return b.rawPrice - a.rawPrice;
    }

    if (sortMode === 'newest') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }

    return 0;
  });
}

const statusOptions = [
  { label: 'كل الحالات', value: 'all' },
  { label: 'متوفر', value: 'inStock' },
  { label: 'جديد', value: 'new' },
  { label: 'عروض', value: 'sale' },
];

const sortOptions = [
  { label: 'الموصى به', value: 'featured' },
  { label: 'الأحدث', value: 'newest' },
  { label: 'السعر من الأقل', value: 'priceAsc' },
  { label: 'السعر من الأعلى', value: 'priceDesc' },
];

const colorOptions = [
  { label: 'الكل', value: 'all', swatch: 'linear-gradient(135deg, #171717, #d8d8d8 48%, #d8a24e 50%, #6a3b1f)' },
  { label: 'أسود', value: 'black', swatch: '#171717' },
  { label: 'فضي', value: 'silver', swatch: 'linear-gradient(135deg, #f0f0f0, #a6a6a6)' },
  { label: 'ذهبي', value: 'gold', swatch: 'linear-gradient(135deg, #ffe79b, #d49a3f)' },
  { label: 'بني', value: 'brown', swatch: '#744421' },
];

const materialOptions = [
  { label: 'كل الخامات', value: 'all' },
  { label: 'جلد', value: 'leather' },
  { label: 'معدن', value: 'metal' },
  { label: 'سيليكون', value: 'silicone' },
];

const priceOptions = [
  { label: 'كل الأسعار', priceMin: null, priceMax: null },
  { label: 'أقل من 500 LYD', priceMin: null, priceMax: 500 },
  { label: '500 - 1000 LYD', priceMin: 500, priceMax: 1000 },
  { label: 'أكثر من 1000 LYD', priceMin: 1000, priceMax: null },
];

function getBrandOptions(products) {
  const brands = [...new Set(products.map((product) => product.brand).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ar'));

  return [
    { label: 'كل الماركات', value: 'all' },
    ...brands.map((brand) => ({ label: brand, value: brand })),
  ];
}

export default function ProductTools({
  activePanel,
  filters,
  isLoading,
  onFiltersChange,
  onPanelChange,
  onSortModeChange,
  products,
  resultCount,
  sortMode,
}) {
  const brandOptions = useMemo(() => getBrandOptions(products), [products]);
  const hasFilters = filters.brand !== 'all'
    || filters.status !== 'all'
    || filters.priceMin !== null
    || filters.priceMax !== null
    || filters.color !== 'all'
    || filters.material !== 'all';

  function togglePanel(panel) {
    onPanelChange(activePanel === panel ? null : panel);
  }

  function updateFilters(nextFilters) {
    onFiltersChange({ ...filters, ...nextFilters });
  }

  function resetPanel() {
    if (activePanel === 'sort') {
      onSortModeChange('featured');
      return;
    }

    onFiltersChange(defaultProductFilters);
  }

  function closePanel() {
    onPanelChange(null);
  }

  function isPriceSelected(option) {
    return filters.priceMin === option.priceMin && filters.priceMax === option.priceMax;
  }

  function renderTextOption({ icon, isSelected, label, onClick, optionKey }) {
    return (
      <button
        key={optionKey ?? label}
        className={isSelected ? 'watches-page__filter-option is-selected' : 'watches-page__filter-option'}
        type="button"
        role="menuitemradio"
        aria-checked={isSelected}
        onClick={onClick}
      >
        <span>{label}</span>
        {icon}
        {isSelected ? <Check aria-hidden="true" /> : null}
      </button>
    );
  }

  return (
    <section
      className={activePanel ? 'watches-page__controls watches-page__controls--open' : 'watches-page__controls'}
      aria-label="أدوات المنتجات"
    >
      <button
        className={activePanel === 'filter' || hasFilters ? 'is-active' : undefined}
        type="button"
        aria-label="تصفية المنتجات"
        aria-expanded={activePanel === 'filter'}
        aria-controls="storefront-filter-panel"
        disabled={isLoading}
        onClick={() => togglePanel('filter')}
      >
        <span>تصفية</span>
        <SlidersHorizontal aria-hidden="true" />
        <ChevronDown className="watches-page__tools-chevron" aria-hidden="true" />
      </button>
      <i aria-hidden="true" />
      <button
        className={activePanel === 'sort' || sortMode !== 'featured' ? 'is-active' : undefined}
        type="button"
        aria-label="ترتيب المنتجات"
        aria-expanded={activePanel === 'sort'}
        aria-controls="storefront-filter-panel"
        disabled={isLoading}
        onClick={() => togglePanel('sort')}
      >
        <span>ترتيب</span>
        <SlidersHorizontal className="watches-page__sort-icon" aria-hidden="true" />
        <ChevronDown className="watches-page__tools-chevron" aria-hidden="true" />
      </button>

      {activePanel ? (
        <div
          className={`watches-page__tools-dropdown watches-page__tools-dropdown--${activePanel}`}
          id="storefront-filter-panel"
          role="menu"
          aria-label={activePanel === 'filter' ? 'خيارات التصفية' : 'خيارات الترتيب'}
        >
          <div className="watches-page__tools-title">
            <strong>{activePanel === 'filter' ? 'تصفية المنتجات' : 'ترتيب المنتجات'}</strong>
            <button type="button" onClick={resetPanel}>إعادة ضبط</button>
          </div>

          {activePanel === 'filter' ? (
            <>
              <div className="watches-page__filter-row">
                <strong><Tags aria-hidden="true" /> العلامة</strong>
                <div className="watches-page__filter-options">
                  {brandOptions.map((brand) => renderTextOption({
                    isSelected: filters.brand === brand.value,
                    label: brand.label,
                    onClick: () => updateFilters({ brand: brand.value }),
                    optionKey: brand.value,
                  }))}
                </div>
              </div>

              <div className="watches-page__filter-row">
                <strong><BadgeDollarSign aria-hidden="true" /> السعر</strong>
                <div className="watches-page__filter-options">
                  {priceOptions.map((option) => renderTextOption({
                    isSelected: isPriceSelected(option),
                    label: option.label,
                    onClick: () => updateFilters({ priceMin: option.priceMin, priceMax: option.priceMax }),
                    optionKey: option.label,
                  }))}
                </div>
              </div>

              <div className="watches-page__filter-row">
                <strong><Pipette aria-hidden="true" /> اللون</strong>
                <div className="watches-page__filter-options watches-page__filter-options--swatches">
                  {colorOptions.map((option) => (
                    <button
                      className={filters.color === option.value ? 'watches-page__filter-option watches-page__filter-option--swatch is-selected' : 'watches-page__filter-option watches-page__filter-option--swatch'}
                      type="button"
                      key={option.value}
                      aria-label={option.label}
                      title={option.label}
                      role="menuitemradio"
                      aria-checked={filters.color === option.value}
                      onClick={() => updateFilters({ color: option.value })}
                    >
                      <span style={{ '--swatch': option.swatch }} />
                      {filters.color === option.value ? <Check aria-hidden="true" /> : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className="watches-page__filter-row">
                <strong><Link2 aria-hidden="true" /> الخامة</strong>
                <div className="watches-page__filter-options">
                  {materialOptions.map((option) => renderTextOption({
                    isSelected: filters.material === option.value,
                    label: option.label,
                    onClick: () => updateFilters({ material: option.value }),
                    optionKey: option.value,
                  }))}
                </div>
              </div>

              <div className="watches-page__filter-row">
                <strong><ShieldCheck aria-hidden="true" /> الحالة</strong>
                <div className="watches-page__filter-options">
                  {statusOptions.map((option) => renderTextOption({
                    isSelected: filters.status === option.value,
                    label: option.label,
                    onClick: () => updateFilters({ status: option.value }),
                    optionKey: option.value,
                  }))}
                </div>
              </div>
            </>
          ) : (
            <div className="watches-page__filter-row watches-page__filter-row--sort">
              <div className="watches-page__filter-options">
                {sortOptions.map((option) => renderTextOption({
                  isSelected: sortMode === option.value,
                  label: option.label,
                  optionKey: option.value,
                  onClick: () => {
                    onSortModeChange(option.value);
                    closePanel();
                  },
                }))}
              </div>
            </div>
          )}

          <div className="watches-page__tools-footer">
            <span>{resultCount.toLocaleString('en-US')} منتج</span>
            <button type="button" onClick={closePanel}>تم</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
