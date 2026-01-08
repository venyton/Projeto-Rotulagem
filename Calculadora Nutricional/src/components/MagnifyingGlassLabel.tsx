import React from 'react';

interface MagnifyingGlassLabelProps {
    highSugar: boolean;
    highFat: boolean;
    highSodium: boolean;
    layout?: 'horizontal' | 'vertical';
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
        highSugar && { src: "/images/lupa/Açúcar Adicionado.png", alt: "Açúcar Adicionado" },
        highFat && { src: "/images/lupa/Gordura Saturada.png", alt: "Gordura Saturada" },
        highSodium && { src: "/images/lupa/Sódio.png", alt: "Sódio" }
    ].filter(Boolean) as { src: string, alt: string }[];

    if (activeAttributes.length === 0) return null;

    // Base Header Image
    const headerImg = "/images/lupa/Alto Em.png";

    // Style for images to ensure they touch? 
    // Usually standard images from dataset might include borders. 
    // If we simply lay them out, gaps might appear.
    // We'll use flex with negative margins if needed, but let's start with gap-0.
    // Also, we need to ensure they align. 
    // Assuming all images have same height (e.g. 50px-ish)?

    return (
        <div id={id} className="inline-block bg-white p-2">
            {/* p-2 gives some whitespace for the export crop */}
            {layout === 'horizontal' ? (
                <div className="flex flex-row items-start gap-0">
                    <img src={headerImg} alt="Alto Em" className="h-[50px] object-contain block" />
                    {activeAttributes.map((attr, idx) => (
                        <img key={idx} src={attr.src} alt={attr.alt} className="h-[50px] object-contain block -ml-[2px]" />
                        // negative margin to overlap borders if they exist? Let's try -ml-1 or similar if visual check fails.
                        // For now -ml-[0px]
                    ))}
                </div>
            ) : (
                // Vertical Layout
                // Logic based on count:
                // 1 item: Row 1 [Header] [Item] (Actually vertical often implies stacking? But 1 item is always horizontal-ish).
                // 2 items: L-Shape. Row 1 [Header] [Item1]. Row 2 [Item2] (Under Header).
                // 3 items: 2x2. Row 1 [Header] [Item1]. Row 2 [Item2] [Item3].

                <div className="grid grid-cols-[auto_auto] gap-0 w-min">
                    {/* Row 1 Col 1: Header */}
                    <img src={headerImg} alt="Alto Em" className="h-[50px] object-contain block" />

                    {/* Row 1 Col 2: Item 1 */}
                    {activeAttributes[0] && (
                        <img src={activeAttributes[0].src} alt={activeAttributes[0].alt} className="h-[50px] object-contain block -ml-[2px]" />
                    )}

                    {/* Row 2 */}
                    {activeAttributes.length >= 2 && (
                        <>
                            {/* Item 2: Usually under Header? or under Item 1? 
                                Standard L-Shape: 
                                [Header] [Item 1]
                                [Item 2]
                                So Item 2 is Col 1, Row 2.
                            */}
                            <img src={activeAttributes[1].src} alt={activeAttributes[1].alt} className="h-[50px] object-contain block -mt-[2px]" />

                            {/* Item 3: Col 2, Row 2 */}
                            {activeAttributes.length >= 3 && (
                                <img src={activeAttributes[2].src} alt={activeAttributes[2].alt} className="h-[50px] object-contain block -mt-[2px] -ml-[2px]" />
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
