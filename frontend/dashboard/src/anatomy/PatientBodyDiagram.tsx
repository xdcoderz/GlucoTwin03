import { ORGANS, type ViewId } from './organs';

export default function PatientBodyDiagram({ selected, className = '' }: { selected: ViewId; className?: string }) {
  const label = selected === 'body' ? 'Illustrated anatomy overview' : `Illustrated anatomy highlighting ${ORGANS[selected].name}`;
  return <svg className={`cockpit-body ${className}`} viewBox="0 0 300 350" role="img" aria-label={label} data-structure={selected}>
    <ellipse className="cockpit-orbit" cx="150" cy="321" rx="103" ry="19" />
    <ellipse className="cockpit-orbit" cx="150" cy="321" rx="76" ry="11" />
    <g className="cockpit-body-shell">
      <ellipse cx="150" cy="40" rx="23" ry="29" />
      <path d="M137 69C131 77 115 76 107 87C96 102 93 127 87 147L77 178L88 184L115 131L117 184Q115 215 126 237L125 307H140L150 231L160 307H175L174 238Q185 215 183 184L185 131L212 184L223 178L213 147C207 127 204 102 193 87C185 76 169 77 163 69Z" />
    </g>
    <path className="cockpit-body-grid" d="M126 87Q150 101 174 87M121 109Q150 126 179 109M120 131Q150 144 180 131M123 179Q150 188 177 179M150 94V194" />
    <g className="cockpit-organ" data-id="muscle"><ellipse cx="108" cy="117" rx="5" ry="19" transform="rotate(17 108 117)" /><ellipse cx="192" cy="117" rx="5" ry="19" transform="rotate(-17 192 117)" /><ellipse cx="134" cy="227" rx="7" ry="22" /><ellipse cx="166" cy="227" rx="7" ry="22" /></g>
    <g className="cockpit-organ" data-id="fat"><path d="M122 161Q130 160 130 173Q130 184 123 191Q118 178 122 161Z" /><path d="M178 161Q170 160 170 173Q170 184 177 191Q182 178 178 161Z" /></g>
    <path className="cockpit-organ" data-id="liver" d="M123 127Q137 116 158 128L154 142Q137 151 121 137Z" />
    <path className="cockpit-organ" data-id="gut" d="M158 132Q169 133 169 143Q171 152 160 155L155 150Q165 148 162 141L156 139Z M135 163Q151 157 164 163Q173 171 160 173H139Q135 174 139 176H159Q171 179 163 186Q149 192 134 186L136 181Q149 186 158 181H138Q125 179 132 170Q137 168 160 168Q165 166 159 165Q147 162 135 167Z" />
    <path className="cockpit-organ" data-id="pancreas" d="M132 151Q137 147 142 150Q146 146 153 148Q159 144 165 146Q173 142 173 148Q171 154 159 156Q146 160 137 157Q132 157 132 151Z" />
  </svg>;
}
