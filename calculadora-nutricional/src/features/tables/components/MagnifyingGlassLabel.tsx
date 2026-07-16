
/* eslint-disable @next/next/no-img-element */
import React from 'react';

interface MagnifyingGlassLabelProps {
    highSugar: boolean;
    highFat: boolean;
    highSodium: boolean;
    layout?: 'horizontal' | 'vertical' | 'rectangular';
    id?: string;
}

export function MagnifyingGlassLabel({
    highSugar,
    highFat,
    highSodium,
    layout = 'vertical',
    id = "magnifying-glass-label"
}: MagnifyingGlassLabelProps) {
    const activeAttributes = [
        highSugar && { src: "/images/lupa/acucar_adicionado.png", alt: "Açúcar Adicionado" },
        highFat && { src: "/images/lupa/gordura_saturada.png", alt: "Gordura Saturada" },
        highSodium && { src: "/images/lupa/sodio.png", alt: "Sódio" }
    ].filter(Boolean) as { src: string, alt: string }[];

    if (activeAttributes.length === 0) return null;

    // Base Header Image
    const headerImg = "/images/lupa/alto_em.png";

    // Style for images to ensure they touch? 
    // Usually standard images from dataset might include borders. 
    // If we simply lay them out, gaps might appear.
    // We'll use flex with negative margins if needed, but let's start with gap-0.
    // Also, we need to ensure they align. 
    // Assuming all images have same height (e.g. 50px-ish)?

    return (
        <div id={id} data-i18n-skip className="inline-block max-w-full" style={{ backgroundColor: '#ffffff' }}>
            {layout === 'horizontal' ? (
                <div className="flex flex-row items-start gap-[2px]">
                    <img src={headerImg} alt="Alto Em" className="h-[50px] object-contain block" />
                    {activeAttributes.map((attr, idx) => (
                        <img key={idx} src={attr.src} alt={attr.alt} className="h-[50px] object-contain block" />
                    ))}
                </div>
            ) : layout === 'vertical' ? (
                // Vertical Layout: Fully Stacked
                <div className="flex flex-col items-start gap-[2px]">
                    <img src={headerImg} alt="Alto Em" className="h-[50px] object-contain block" />
                    {activeAttributes.map((attr, idx) => (
                        <img key={idx} src={attr.src} alt={attr.alt} className="h-[50px] object-contain block" />
                    ))}
                </div>
            ) : (
                // Rectangular Layout (2x2 Grid)
                <div className="flex flex-col items-center gap-[2px]">
                    <div className="flex flex-row justify-center gap-[2px]">
                        <img src={headerImg} alt="Alto Em" className="h-[50px] object-contain block" />
                        {activeAttributes[0] && (
                            <img src={activeAttributes[0].src} alt={activeAttributes[0].alt} className="h-[50px] object-contain block" />
                        )}
                    </div>
                    {(activeAttributes.length > 1) && (
                        <div className="flex flex-row justify-center gap-[2px]">
                            {activeAttributes[1] && (
                                <img src={activeAttributes[1].src} alt={activeAttributes[1].alt} className="h-[50px] object-contain block" />
                            )}
                            {activeAttributes[2] && (
                                <img src={activeAttributes[2].src} alt={activeAttributes[2].alt} className="h-[50px] object-contain block" />
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
