import React from 'react';
import { Box } from '@mui/material';
import { TitleBar } from './TitleBar';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <TitleBar />
            <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>{children}</Box>
        </Box>
    );
};
