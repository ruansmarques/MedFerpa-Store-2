export const PRODUCTS = [
    {
        id: 1,
        slug: "tech-t-shirt",
        name: "TECH T-SHIRT®",
        price: 159.00,
        model: "Camiseta",
        badges: ["BEST SELLER", "16% OFF"],
        description: "A camiseta tecnológica que não precisa passar, não desbota e não apresenta odor.",
        features: ["Não precisa passar", "Antiodor", "Não desbota"],
        colors: [
            { name: "Preto", hex: "#000000", images: ["https://placehold.co/600x800?text=Tech+Black+1", "https://placehold.co/600x800?text=Tech+Black+2"] },
            { name: "Azul", hex: "#2121ab", images: ["https://placehold.co/600x800?text=Tech+Blue+1"] }
        ],
        sizes: ["PP", "P", "M", "G", "GG"]
    },
    {
        id: 2,
        slug: "daily-t-shirt",
        name: "DAILY T-SHIRT",
        price: 138.00,
        model: "Camiseta",
        badges: ["NOVO"],
        description: "A peça essencial para o seu guarda-roupa básico. Conforto extremo.",
        features: ["Toque macio", "Alta durabilidade"],
        colors: [
            { name: "Branco", hex: "#ffffff", images: ["https://placehold.co/600x800?text=Daily+White+1"] },
            { name: "Preto", hex: "#000000", images: ["https://placehold.co/600x800?text=Daily+Black+1"] }
        ],
        sizes: ["P", "M", "G", "GG"]
    },
    {
        id: 4,
        slug: "calca-futureform",
        name: "CALÇA FUTUREFORM",
        price: 399.00,
        model: "Calça",
        badges: ["TECNOLÓGICA"],
        description: "A calça que une alfaiataria com o conforto do moletom.",
        features: ["Repele líquidos", "Elasticidade 4-way"],
        colors: [
            { name: "Preto", hex: "#000000", images: ["https://placehold.co/600x800?text=Future+Black+1"] },
            { name: "Areia", hex: "#d2b48c", images: ["https://placehold.co/600x800?text=Future+Sand+1"] }
        ],
        sizes: ["40", "42", "44", "46"]
    }
];