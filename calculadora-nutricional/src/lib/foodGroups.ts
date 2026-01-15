export type Product = {
    name: string;
    portion: number;
    measure: string;
};

export type FoodGroup = {
    group: string;
    products: Product[];
};

export const FOOD_GROUPS: FoodGroup[] = [
    {
        "group": "Grupo I: Produtos de panificação, cereais, leguminosas, raízes, tubérculos e seus derivados (Valor energético médio da porção é 150 kcal).",
        "products": [
            {
                "name": "Amidos e féculas",
                "portion": 20,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Arroz cru",
                "portion": 50,
                "measure": "Xícaras"
            },
            {
                "name": "Aveia em flocos sem outros ingredientes",
                "portion": 30,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Barra de cereais com até 10% de gordura",
                "portion": 30,
                "measure": "Unidades"
            },
            {
                "name": "Batata, mandioca e outros tubérculos, cozidos em água embalada à vácuo",
                "portion": 150,
                "measure": "Unidades ou xícara"
            },
            {
                "name": "Batata e mandioca pré-frita congelada",
                "portion": 85,
                "measure": "Unidades ou xícaras"
            },
            {
                "name": "Produtos à base de tubérculos e cereais pré-fritos ou congelados",
                "portion": 85,
                "measure": "Unidades"
            },
            {
                "name": "Biscoito salgados, integrais e grissines",
                "portion": 30,
                "measure": "Unidades"
            },
            {
                "name": "Bolos, todos os tipos sem recheio",
                "portion": 60,
                "measure": "Fatia ou fração"
            },
            {
                "name": "Canjica (grão cru)",
                "portion": 50,
                "measure": "Xícaras"
            },
            {
                "name": "Cereal matinal pesando até 45 g por xícara",
                "portion": 30,
                "measure": "Xícaras"
            },
            {
                "name": "Cereal matinal pesando mais do que 45 g por xícara",
                "portion": 40,
                "measure": "Xícaras"
            },
            {
                "name": "Cereais integrais crus",
                "portion": 45,
                "measure": "Xícaras"
            },
            {
                "name": "Farinhas de cereais e tubérculos, todos os tipos",
                "portion": 50,
                "measure": "Xícaras"
            },
            {
                "name": "Farelo de cereais e germe de trigo",
                "portion": 10,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Farinha láctea",
                "portion": 30,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Farofa pronta",
                "portion": 35,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Massa alimentícia seca",
                "portion": 80,
                "measure": "Pratos ou xícaras"
            },
            {
                "name": "Massa desidratada com recheio",
                "portion": 70,
                "measure": "Pratos ou xícaras"
            },
            {
                "name": "Massas frescas com e sem recheios",
                "portion": 100,
                "measure": "Pratos ou xícaras"
            },
            {
                "name": "Pães embalados fatiados ou não, com ou sem recheio",
                "portion": 50,
                "measure": "Unidades ou fatias"
            },
            {
                "name": "Pães embalados de consumo individual, chipa paraguaia",
                "portion": 50,
                "measure": "Unidades"
            },
            {
                "name": "Pão doce sem frutas",
                "portion": 40,
                "measure": "Unidades"
            },
            {
                "name": "Pão croissant, outros produtos de panificação, salgados ou doces sem recheio",
                "portion": 40,
                "measure": "Unidades"
            },
            {
                "name": "Pão de batata, pão de queijo e outros resfriados e congelados com recheio e massas para pães",
                "portion": 40,
                "measure": "Unidades ou fatias"
            },
            {
                "name": "Pão de batata, pão de queijo e outros resfriados e congelados sem recheio, chipa paraguaia",
                "portion": 50,
                "measure": "Unidades ou fatias"
            },
            {
                "name": "Pipoca",
                "portion": 25,
                "measure": "Xícaras"
            },
            {
                "name": "Torradas",
                "portion": 30,
                "measure": "Unidades"
            },
            {
                "name": "Tofu",
                "portion": 40,
                "measure": "Fatias"
            },
            {
                "name": "Trigo para quibe e proteína texturizada de soja",
                "portion": 50,
                "measure": "Xícaras"
            },
            {
                "name": "Leguminosas secas, todas",
                "portion": 60,
                "measure": "Xícaras"
            },
            {
                "name": "Pós para preparar flans e sobremesas",
                "portion": 120,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Sagu",
                "portion": 30,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Massas para pasteis e panquecas",
                "portion": 30,
                "measure": "Unidades"
            },
            {
                "name": "Massa para tortas salgadas",
                "portion": 30,
                "measure": "Frações"
            },
            {
                "name": "Massa para pizza",
                "portion": 40,
                "measure": "Fatias"
            },
            {
                "name": "Farinha de rosca",
                "portion": 30,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Preparações a base de soja tipo: milanesa, almondegas e hambúrguer)",
                "portion": 80,
                "measure": "Unidades"
            },
            {
                "name": "Mistura para sopa paraguaia y chipaguazú",
                "portion": 150,
                "measure": "Fatias"
            },
            {
                "name": "Pré-mistura para preparar bori-bori",
                "portion": 80,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Pré-mistura para preparar chipa paraguaia e mbeyu e outros pães",
                "portion": 50,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Preparado desidratados para purês de tubérculos",
                "portion": 150,
                "measure": "Colheres de sopa ou xícaras"
            },
            {
                "name": "Pós para preparar bolos e tortas",
                "portion": 60,
                "measure": "Colheres de sopa"
            }
        ]
    },
    {
        "group": "Grupo II: Verduras, hortaliças e conservas vegetais (Valor energético médio da porção é 30 kcal).",
        "products": [
            {
                "name": "Concentrado de vegetais triplo (extrato)",
                "portion": 30,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Concentrado de vegetais",
                "portion": 15,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Purê ou polpa de vegetais, incluindo tomate",
                "portion": 60,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Molho de tomate ou a base de tomate e outros vegetais",
                "portion": 60,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Picles e alcaparras",
                "portion": 15,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Sucos de vegetais, frutas e sojas",
                "portion": 200,
                "measure": "Copos"
            },
            {
                "name": "Vegetais desidratados em conserva (tomate seco)",
                "portion": 40,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Vegetais desidratados para sopa",
                "portion": 40,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Vegetais desidratados para purê",
                "portion": 150,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Vegetais em conserva (alcachofra, aspargo, cogumelos, pimentão, pepino e palmito) em salmoura, vinagre e azeite",
                "portion": 50,
                "measure": "Unidades ou xícaras"
            },
            {
                "name": "Jardineira e outras conservas de vegetais e legumes (cenouras, ervilhas, milho, tomate pelado e outros)",
                "portion": 130,
                "measure": "Xícaras"
            },
            {
                "name": "Vegetais empanados",
                "portion": 80,
                "measure": "Unidades"
            }
        ]
    },
    {
        "group": "Grupo III: Frutas, sucos, néctares e refrescos de frutas (Valor energético médio da porção é 70 kcal).",
        "products": [
            {
                "name": "Polpa de frutas para refresco, sucos concentrados de frutas e desidratados",
                "portion": 200,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Polpa de frutas para sobremesas",
                "portion": 50,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Suco, néctar e bebidas de frutas",
                "portion": 200,
                "measure": "Copos"
            },
            {
                "name": "Frutas desidratadas (peras, pêssegos, abacaxi, ameixas, partes comestíveis)",
                "portion": 50,
                "measure": "Unidades ou colheres de sopa"
            },
            {
                "name": "Uva passa",
                "portion": 30,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Fruta em conserva, incluindo salada de frutas",
                "portion": 140,
                "measure": "Unidades ou colheres de sopa"
            }
        ]
    },
    {
        "group": "Grupo IV: Leites e derivados (Valor energético médio da porção é 125 kcal).",
        "products": [
            {
                "name": "Bebida láctea",
                "portion": 200,
                "measure": "Copos"
            },
            {
                "name": "Leites fermentados, iogurte, todos os tipos",
                "portion": 200,
                "measure": "Copos"
            },
            {
                "name": "Leite fluido, todos os tipos",
                "portion": 200,
                "measure": "Copos"
            },
            {
                "name": "Leite evaporado",
                "portion": 200,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Queijo ralado",
                "portion": 10,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Queijo cottage, ricota desnatado, queijo minas, requeijão desnatado e petit-suisse",
                "portion": 50,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Outros queijos (ricota, semiduros, branco, requeijão, queijo cremoso, fundidos e em pasta)",
                "portion": 30,
                "measure": "Colheres de sopa ou fatias"
            },
            {
                "name": "Leite em pó",
                "portion": 200,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Sobremesas lácteas",
                "portion": 120,
                "measure": "Unidades ou xícaras"
            },
            {
                "name": "Pós para preparar sobremesas lácteas",
                "portion": 120,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Pós para preparar sorvetes",
                "portion": 50,
                "measure": "Colheres de sopa"
            }
        ]
    },
    {
        "group": "Grupo V: Carnes e ovos (Valor energético médio da porção é 125 kcal).",
        "products": [
            {
                "name": "Almôndegas a base de carnes",
                "portion": 80,
                "measure": "Unidades"
            },
            {
                "name": "Anchovas em conserva",
                "portion": 15,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Apresuntado e corned beef",
                "portion": 30,
                "measure": "Fatias"
            },
            {
                "name": "Atum, sardinha, pescado, mariscos, outros peixes em conserva com ou sem molhos",
                "portion": 60,
                "measure": "Unidades ou colheres de sopa"
            },
            {
                "name": "Caviar",
                "portion": 10,
                "measure": "Colheres de chá"
            },
            {
                "name": "Charque",
                "portion": 30,
                "measure": "Frações ou pratos"
            },
            {
                "name": "Hambúrguer a base de carnes",
                "portion": 80,
                "measure": "Unidades"
            },
            {
                "name": "Linguiça, salsicha, todos os tipos",
                "portion": 50,
                "measure": "Unidades ou frações"
            },
            {
                "name": "Kani-kama",
                "portion": 20,
                "measure": "Unidades ou colheres de sopa"
            },
            {
                "name": "Preparações de carnes temperados, defumadas, cozidas ou não",
                "portion": 100,
                "measure": "Unidades"
            },
            {
                "name": "Preparações de carnes com farinhas ou empanadas",
                "portion": 130,
                "measure": "Unidades"
            },
            {
                "name": "Embutidos, fiambre e presunto",
                "portion": 40,
                "measure": "Unidades ou fatias"
            },
            {
                "name": "Peito de peru, blanquet",
                "portion": 60,
                "measure": "Unidades ou fatias"
            },
            {
                "name": "Patês (presunto, fígado e bacon etc)",
                "portion": 10,
                "measure": "Colheres de chá"
            },
            {
                "name": "Ovo",
                "portion": 0,
                "measure": "Unidades"
            }
        ]
    },
    {
        "group": "Grupo VI: Óleos, gorduras e sementes oleaginosas (Valor energético médio da porção é 100 kcal).",
        "products": [
            {
                "name": "Óleos vegetais, todos os tipos",
                "portion": 13,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Azeitona",
                "portion": 20,
                "measure": "Unidades"
            },
            {
                "name": "Bacon em pedaços - defumado ou fresco",
                "portion": 10,
                "measure": "Fatias"
            },
            {
                "name": "Banha e gorduras animais",
                "portion": 10,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Gordura vegetal",
                "portion": 10,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Maionese e molhos a base de maionese",
                "portion": 12,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Manteiga, margarina e similares",
                "portion": 10,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Molhos para saladas a base de óleo (todos os tipos)",
                "portion": 13,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Chantilly",
                "portion": 20,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Creme de leite",
                "portion": 15,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Leite de coco",
                "portion": 15,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Coco ralado",
                "portion": 12,
                "measure": "Colheres de chá"
            },
            {
                "name": "Sementes oleaginosas (misturados, cortados, picados, inteiros)",
                "portion": 15,
                "measure": "Colheres de sopa"
            }
        ]
    },
    {
        "group": "Grupo VII: Açúcares e produtos com energia proveniente de carboidratos e gorduras (Valor energético médio da porção é 100 kcal).",
        "products": [
            {
                "name": "Açúcar, todos os tipos",
                "portion": 5,
                "measure": "Colheres de chá"
            },
            {
                "name": "Achocolatado em pó, pós com base de cacau, chocolate em pó e cacau em pó",
                "portion": 20,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Doces em corte (goiaba, marmelo, figo, batata etc)",
                "portion": 40,
                "measure": "Fatias"
            },
            {
                "name": "Doces em pasta (abóbora, goiaba, leite, banana, mocotó)",
                "portion": 20,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Geleias diversas",
                "portion": 20,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Glicose de milho, mel, melado, cobertura de frutas, leite condensado e outros xaropes (cassis, groselha, framboesa, amora, guaraná etc)",
                "portion": 20,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Pó para gelatina",
                "portion": 120,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Sobremesa de gelatina pronta",
                "portion": 120,
                "measure": "Unidades"
            },
            {
                "name": "Frutas inteiras em conserva para adornos (cereja maraschino, framboesa)",
                "portion": 20,
                "measure": "Unidades"
            },
            {
                "name": "Balas, pirulitos e pastilhas",
                "portion": 20,
                "measure": "Unidades"
            },
            {
                "name": "Goma de mascar",
                "portion": 3,
                "measure": "Unidades"
            },
            {
                "name": "Chocolates, bombons e similares",
                "portion": 25,
                "measure": "Unidades ou frações"
            },
            {
                "name": "Confeitos de chocolate e drageados em geral",
                "portion": 25,
                "measure": "Unidades ou colheres de sopa"
            },
            {
                "name": "Sorvetes de massa",
                "portion": 60,
                "measure": "Bolas ou unidades"
            },
            {
                "name": "Sorvetes individuais",
                "portion": 60,
                "measure": "Unidades"
            },
            {
                "name": "Barra de cereais com mais de 10% de gorduras, torrones, pé de moleque e paçoca",
                "portion": 20,
                "measure": "Unidades ou frações"
            },
            {
                "name": "Bebidas não alcoólicas, carbonadas ou não (chás, bebidas à base de soja e refrigerantes)",
                "portion": 200,
                "measure": "Xícaras ou copos"
            },
            {
                "name": "Pós para preparo de refresco",
                "portion": 200,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Biscoito doce, com ou sem recheio",
                "portion": 30,
                "measure": "Unidades"
            },
            {
                "name": "Brownies e alfajores",
                "portion": 40,
                "measure": "Unidades"
            },
            {
                "name": "Frutas cristalizadas",
                "portion": 30,
                "measure": "Unidades ou colheres de sopa"
            },
            {
                "name": "Panetone",
                "portion": 80,
                "measure": "Unidades ou fatias"
            },
            {
                "name": "Bolo com frutas",
                "portion": 60,
                "measure": "Unidades ou fatias"
            },
            {
                "name": "Bolos e similares com recheio ou cobertura",
                "portion": 60,
                "measure": "Unidades ou fatias"
            },
            {
                "name": "Pão croissant, produtos de panificação, salgados ou doces com recheio ou cobertura",
                "portion": 40,
                "measure": "Unidades"
            },
            {
                "name": "Snacks a base de cereais e farinhas para petisco",
                "portion": 25,
                "measure": "Xícaras"
            },
            {
                "name": "Mistura para preparo de docinho, cobertura para bolos, tortas e sorvetes etc",
                "portion": 20,
                "measure": "Colheres de sopa"
            }
        ]
    },
    {
        "group": "Grupo VIII: Molhos, temperos prontos, caldos, sopas, pratos semiprontos ou prontos para consumo e bebidas alcoólicas.",
        "products": [
            {
                "name": "Caldo (carne, galinha, legumes etc) e pós para sopa incluindo (bori-bori, pirá caldo, shoyo)",
                "portion": 250,
                "measure": "Unidades, colheres de sopa ou frações"
            },
            {
                "name": "Catchup e mostarda",
                "portion": 12,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Molhos a base de soja ou vinagre",
                "portion": 0,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Molhos a base de produtos lácteos ou caldos",
                "portion": 0,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Pós para preparar molhos",
                "portion": 2,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Misso",
                "portion": 20,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Missoshiro",
                "portion": 200,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Extrato de soja",
                "portion": 30,
                "measure": "Colheres de sopa"
            },
            {
                "name": "Pratos preparados prontos e semipronto não incluídos em outros itens da tabela",
                "portion": 100,
                "measure": "Unidades ou frações"
            },
            {
                "name": "Tempero completos",
                "portion": 5,
                "measure": "Colheres de chá"
            },
            {
                "name": "Bebidas alcoólicas",
                "portion": 10,
                "measure": "Unidades ou copos"
            }
        ]
    }
];
