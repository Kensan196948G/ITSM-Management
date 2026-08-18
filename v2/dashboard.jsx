/* ITSM v2 — Dashboard View with Charts */

/* ── SVG Mini Bar Chart ── */
function MiniBarChart({ data, width=320, height=160, color='var(--c-primary-500)' }) {
  if (!data || !data.length) return null;
  const max = Math.max(1, ...data.map(d=>d.value));
  const barW = Math.max(12, (width - (data.length+1)*8) / data.length);
  const gap = 8;
  const pad = { top:16, bottom:32, left:8 };
  const chartH = height - pad.top - pad.bottom;

  return React.createElement('svg', { width, height, role:'img', 'aria-label':'バーチャート', style:{display:'block'} },
    ...data.map((d, i) => {
      const x = pad.left + i * (barW + gap) + gap;
      const barH = (d.value / max) * chartH;
      const y = pad.top + chartH - barH;
      return React.createElement('g', { key: i },
        React.createElement('rect', { x, y, width:barW, height:barH, rx:4, fill:color, opacity:0.85 }),
        React.createElement('text', { x:x+barW/2, y:y-6, textAnchor:'middle', fontSize:11, fill:'var(--c-text-3)', fontWeight:600 }, d.value),
        React.createElement('text', { x:x+barW/2, y:height-8, textAnchor:'middle', fontSize:10, fill:'var(--c-text-4)' }, d.label),
      );
    })
  );
}

/* ── SVG Line Chart ── */
function MiniLineChart({ data, width=440, height=180, color='var(--c-primary-500)' }) {
  if (!data || !data.length) return null;
  const max = Math.max(1, ...data.map(d=>d.value));
  const pad = { top:20, bottom:36, left:36, right:16 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;
  const pts = data.map((d,i) => ({
    x: pad.left + (i / Math.max(1,data.length-1)) * cw,
    y: pad.top + ch - (d.value/max) * ch,
    ...d
  }));
  const line = pts.map((p,i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
  const area = line + ` L${pts[pts.length-1].x},${pad.top+ch} L${pts[0].x},${pad.top+ch} Z`;

  /* Grid lines */
  const gridLines = [0,0.25,0.5,0.75,1].map(f => pad.top + ch * (1-f));

  return React.createElement('svg', { width, height, role:'img', 'aria-label':'ラインチャート', style:{display:'block'} },
    /* Grid */
    ...gridLines.map((gy,i) =>
      React.createElement('line', { key:'g'+i, x1:pad.left, x2:width-pad.right, y1:gy, y2:gy, stroke:'var(--c-border)', strokeDasharray:'3,3', strokeWidth:0.5 })
    ),
    /* Area fill */
    React.createElement('path', { d:area, fill:color, opacity:0.08 }),
    /* Line */
    React.createElement('path', { d:line, fill:'none', stroke:color, strokeWidth:2.5, strokeLinecap:'round', strokeLinejoin:'round' }),
    /* Points + labels */
    ...pts.map((p,i) => React.createElement('g', { key:i },
      React.createElement('circle', { cx:p.x, cy:p.y, r:4, fill:'var(--c-surface)', stroke:color, strokeWidth:2 }),
      React.createElement('text', { x:p.x, y:p.y-10, textAnchor:'middle', fontSize:11, fill:'var(--c-text-2)', fontWeight:600 }, p.value),
      React.createElement('text', { x:p.x, y:height-8, textAnchor:'middle', fontSize:10, fill:'var(--c-text-4)' }, p.label),
    ))
  );
}

/* ── SVG Donut Chart ── */
function DonutChart({ data, size=160, thickness=20, centerLabel }) {
  const total = data.reduce((s,d) => s + d.value, 0) || 1;
  const cx = size/2, cy = size/2, r = (size - thickness) / 2;
  const circum = 2 * Math.PI * r;
  let offset = 0;

  return React.createElement('svg', { width:size, height:size, role:'img', 'aria-label':'ドーナツチャート', style:{display:'block'} },
    ...data.map((d,i) => {
      const pct = d.value / total;
      const dash = pct * circum;
      const el = React.createElement('circle', {
        key:i, cx, cy, r, fill:'none', stroke:d.color,
        strokeWidth:thickness, strokeDasharray:`${dash} ${circum - dash}`,
        strokeDashoffset: -offset, strokeLinecap:'round',
        style: { transition:'stroke-dasharray 0.6s var(--ease)' }
      });
      offset += dash;
      return el;
    }),
    centerLabel && React.createElement('text', { x:cx, y:cy, textAnchor:'middle', dominantBaseline:'central', fontSize:20, fontWeight:700, fill:'var(--c-text)' }, centerLabel),
  );
}

/* ── Dashboard View Component ── */
function DashboardView({ dense }) {
  const summary = React.useMemo(() => MockAPI.getDashboardSummary(), []);

  /* Trend data */
  const trendData = React.useMemo(() => {
    return Array.from({length:7}, (_,i) => {
      const dt = new Date(Date.now() - (6-i)*86400000);
      return { label: `${dt.getMonth()+1}/${dt.getDate()}`, value: Math.floor(Math.random()*5)+1 };
    });
  }, []);

  const categoryData = React.useMemo(() => [
    { label:'メール', value:3, color:'var(--c-primary-500)' },
    { label:'ネットワーク', value:4, color:'var(--c-warn-600)' },
    { label:'PC', value:2, color:'var(--c-success-600)' },
    { label:'クラウド', value:2, color:'var(--c-info-600)' },
    { label:'その他', value:1, color:'var(--c-text-4)' },
  ], []);

  const slaDonut = React.useMemo(() => [
    { value: summary.slaRate, color: 'var(--c-success-600)' },
    { value: 100 - summary.slaRate, color: 'var(--c-border)' },
  ], [summary]);

  const priorityData = React.useMemo(() => [
    { label:'緊急', value:2 },
    { label:'高', value:3 },
    { label:'中', value:4 },
    { label:'低', value:1 },
  ], []);

  const siteData = [
    { name:'本社', incidents:6, status:'normal' },
    { name:'現場A', incidents:2, status:'warning' },
    { name:'現場B', incidents:1, status:'normal' },
    { name:'全拠点', incidents:1, status:'critical' },
  ];

  const gap = dense ? 16 : 20;

  return React.createElement(PageLayout, {
    title: 'ダッシュボード',
    subtitle: 'ITSMシステムの全体的な状況と主要メトリクス',
    breadcrumb: ['ホーム', 'ダッシュボード'],
    dense,
    actions: React.createElement(React.Fragment, null,
      React.createElement(Btn, { variant:'outline', size:'sm' }, '📋 レポート'),
      React.createElement(Btn, { variant:'primary', size:'sm' }, '＋ 新規インシデント'),
    )
  },
    /* KPI Cards */
    React.createElement('div', { style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap,marginBottom:gap} },
      React.createElement(KPICard, { title:'総チケット数', value:summary.total+'件', icon:'📋', color:'primary', subtitle:'全期間' }),
      React.createElement(KPICard, { title:'未対応', value:summary.open+'件', icon:'⏳', color:'warning', subtitle:'要対応' }),
      React.createElement(KPICard, { title:'SLA違反', value:summary.overdue+'件', icon:'⚠', color:'danger', subtitle:'期限超過' }),
      React.createElement(KPICard, { title:'SLA遵守率', value:summary.slaRate+'%', icon:'✓', color:'success', subtitle:'解決済ベース' }),
      React.createElement(KPICard, { title:'平均解決時間', value:summary.avgHours+'h', icon:'⏱', color:'info', subtitle:'解決済チケット' }),
    ),

    /* Charts Row */
    React.createElement('div', { style:{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap,marginBottom:gap} },
      /* Trend Chart */
      React.createElement('div', { style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:dense?16:24} },
        React.createElement('h3', { style:{fontSize:'var(--fs-md)',fontWeight:600,marginBottom:16,color:'var(--c-text)'} }, '日別インシデント推移'),
        React.createElement('div', { style:{display:'flex',justifyContent:'center'} },
          React.createElement(MiniLineChart, { data:trendData, width:500, height:200 })
        )
      ),
      /* Category + SLA */
      React.createElement('div', { style:{display:'flex',flexDirection:'column',gap} },
        React.createElement('div', { style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:dense?16:24,flex:1} },
          React.createElement('h3', { style:{fontSize:'var(--fs-md)',fontWeight:600,marginBottom:16,color:'var(--c-text)'} }, 'SLA遵守率'),
          React.createElement('div', { style:{display:'flex',alignItems:'center',justifyContent:'center',gap:24} },
            React.createElement(DonutChart, { data:slaDonut, size:120, thickness:16, centerLabel:summary.slaRate+'%' }),
            React.createElement('div', { style:{fontSize:'var(--fs-sm)',color:'var(--c-text-3)',display:'flex',flexDirection:'column',gap:8} },
              React.createElement('div', null, React.createElement('span', { style:{display:'inline-block',width:10,height:10,borderRadius:'var(--r-full)',background:'var(--c-success-600)',marginRight:8} }), '遵守: ', summary.slaRate, '%'),
              React.createElement('div', null, React.createElement('span', { style:{display:'inline-block',width:10,height:10,borderRadius:'var(--r-full)',background:'var(--c-border)',marginRight:8} }), '違反: ', 100-summary.slaRate, '%'),
            )
          )
        ),
        React.createElement('div', { style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:dense?16:24,flex:1} },
          React.createElement('h3', { style:{fontSize:'var(--fs-md)',fontWeight:600,marginBottom:12,color:'var(--c-text)'} }, '優先度別'),
          React.createElement('div', { style:{display:'flex',justifyContent:'center'} },
            React.createElement(MiniBarChart, { data:priorityData, width:260, height:130, color:'var(--c-primary-500)' })
          )
        ),
      )
    ),

    /* Bottom Row: Sites + Category Breakdown */
    React.createElement('div', { style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap} },
      /* Site Overview */
      React.createElement('div', { style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:dense?16:24} },
        React.createElement('h3', { style:{fontSize:'var(--fs-md)',fontWeight:600,marginBottom:16,color:'var(--c-text)'} }, '拠点別状況'),
        React.createElement('div', { style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12} },
          ...siteData.map(s => {
            const sColor = s.status==='critical' ? 'danger' : s.status==='warning' ? 'warning' : 'success';
            const bgMap = { danger:'var(--c-danger-50)', warning:'var(--c-warn-50)', success:'var(--c-success-50)' };
            const cMap = { danger:'var(--c-danger-600)', warning:'var(--c-warn-600)', success:'var(--c-success-600)' };
            return React.createElement('div', { key:s.name, style:{padding:14,borderRadius:'var(--r-md)',border:'1px solid var(--c-border)',display:'flex',alignItems:'center',justifyContent:'space-between'} },
              React.createElement('div', null,
                React.createElement('div', { style:{fontWeight:600,fontSize:'var(--fs-sm)',color:'var(--c-text)'} }, s.name),
                React.createElement('div', { style:{fontSize:12,color:'var(--c-text-4)',marginTop:2} }, s.incidents+'件')
              ),
              React.createElement('div', { style:{width:10,height:10,borderRadius:'var(--r-full)',background:cMap[sColor]} })
            );
          })
        )
      ),
      /* Category Breakdown */
      React.createElement('div', { style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:dense?16:24} },
        React.createElement('h3', { style:{fontSize:'var(--fs-md)',fontWeight:600,marginBottom:16,color:'var(--c-text)'} }, 'カテゴリ別分布'),
        React.createElement('div', { style:{display:'flex',flexDirection:'column',gap:12} },
          ...categoryData.map(c => {
            const pct = Math.round(c.value / categoryData.reduce((s,x)=>s+x.value,0) * 100);
            return React.createElement('div', { key:c.label },
              React.createElement('div', { style:{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:'var(--fs-sm)'} },
                React.createElement('span', { style:{color:'var(--c-text-2)'} }, c.label),
                React.createElement('span', { style:{color:'var(--c-text-3)',fontWeight:600,fontFamily:'var(--font-mono)'} }, c.value+'件 ('+pct+'%)'),
              ),
              React.createElement('div', { style:{height:8,background:'var(--c-hover)',borderRadius:'var(--r-full)',overflow:'hidden'} },
                React.createElement('div', { style:{height:'100%',width:pct+'%',background:c.color,borderRadius:'var(--r-full)',transition:'width 0.6s var(--ease)'} })
              )
            );
          })
        ),
        /* Quick stat cards */
        React.createElement('div', { style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:16} },
          React.createElement('div', { style:{padding:12,borderRadius:'var(--r-md)',background:'var(--c-hover)',textAlign:'center'} },
            React.createElement('div', { style:{fontSize:18,fontWeight:700,color:'var(--c-primary-600)'} }, summary.problems),
            React.createElement('div', { style:{fontSize:11,color:'var(--c-text-4)'} }, '未解決問題')
          ),
          React.createElement('div', { style:{padding:12,borderRadius:'var(--r-md)',background:'var(--c-hover)',textAlign:'center'} },
            React.createElement('div', { style:{fontSize:18,fontWeight:700,color:'var(--c-warn-600)'} }, summary.changes),
            React.createElement('div', { style:{fontSize:11,color:'var(--c-text-4)'} }, '変更管理')
          ),
        )
      )
    ),
  );
}

Object.assign(window, { DashboardView, MiniBarChart, MiniLineChart, DonutChart });
