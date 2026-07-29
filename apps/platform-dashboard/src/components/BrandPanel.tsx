export function BrandPanel() {
  return (
    <aside className="brand-panel" aria-label="هوية LabibTech">
      <div className="brand-copy">
        <img
          className="brand-logo"
          src="/assets/labibtech-logo.png"
          alt="LabibTech"
          width="1254"
          height="1254"
          draggable="false"
        />

        <div className="platform-badge">
          <img
            src="/assets/platform-emblem.png"
            alt=""
            width="26"
            height="26"
            aria-hidden="true"
          />
          <span>لوحة الإدارة الرئيسية</span>
        </div>

        <h2>تحكم كامل بمنصتك</h2>
        <p>
          أدر متجرك، البائعين، الاشتراكات، النطاقات، التقارير
          <br />
          والإعدادات العامة للمنصة من مركز تحكم واحد.
        </p>
      </div>

      <img
        className="platform-core-art"
        src="/assets/labibtech-platform-core.png"
        alt="منظومة LabibTech لإدارة المتاجر والبائعين والاشتراكات والنطاقات"
        width="1122"
        height="1402"
        draggable="false"
      />
    </aside>
  )
}
