import Transition from './useTranstion';
import ReactNoopRenderer from 'react-dom';

const root = ReactNoopRenderer.createRoot(document.querySelector('#root'));

root.render(<Transition />);
