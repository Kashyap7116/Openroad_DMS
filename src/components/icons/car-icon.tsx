
import { SVGProps } from 'react';

export function CarIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M14 16.5V14a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2.5" />
            <path d="M20 10h-2V8.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2V10H2" />
            <path d="M4 10V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5V10" />
            <path d="M2 17H1a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1" />
            <path d="M22 17h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1" />
            <circle cx="7" cy="18" r="2" />
            <circle cx="17" cy="18" r="2" />
        </svg>
    )
}

    