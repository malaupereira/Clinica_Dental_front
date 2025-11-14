import { useLocation } from 'react-router-dom';

export const SectionLogo = () => {
  const location = useLocation();
  const path = location.pathname;

  const getSectionTitle = () => {
    if (path.startsWith('/clinic')) {
      return 'DENTAL STUDIO';
    } else if (path.startsWith('/batas')) {
      return 'DR. DRESS';
    } else if (path.startsWith('/admin')) {
      return 'ADMINISTRACIÓN';
    }
    return 'SISTEMA';
  };

  return (
    <div className="flex items-center justify-center h-full">
      <h1 className="text-xl font-light tracking-widest text-foreground">
        {getSectionTitle()}
      </h1>
    </div>
  );
};
