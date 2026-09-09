import { useLocation } from 'react-router-dom';
import { useLayoutEffect } from 'react';

const ScrollToTop = () => {
    const { hash, pathname } = useLocation();

    useLayoutEffect(() => {
        if (hash) {
            window.requestAnimationFrame(() => {
                const target = document.getElementById(decodeURIComponent(hash.slice(1)));
                if (target) {
                    target.scrollIntoView({ block: 'start' });
                }
            });
            return;
        }

        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [hash, pathname]);

    return null;
}

export default ScrollToTop;
