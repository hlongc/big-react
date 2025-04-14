import { useState } from 'react';
import TabButton from './TabButton';
import AboutTab from './AboutTab';
import PostsTab from './PostsTab';
import ContactTab from './ContactTab';

export default function TabContainer() {
	const [tab, setTab] = useState('about');
	return (
		<>
			<TabButton isActive={tab === 'about'} action={() => setTab('about')}>
				About
			</TabButton>
			<TabButton isActive={tab === 'posts'} action={() => setTab('posts')}>
				Posts (slow)
			</TabButton>
			<TabButton isActive={tab === 'contact'} action={() => setTab('contact')}>
				Contact
			</TabButton>
			<hr />
			{tab === 'about' && <AboutTab />}
			{tab === 'posts' && <PostsTab />}
			{tab === 'contact' && <ContactTab />}
		</>
	);
}
