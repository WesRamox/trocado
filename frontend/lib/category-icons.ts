import {
  Baby,
  Briefcase,
  Bus,
  Car,
  CircleDashed,
  Coffee,
  Coins,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  Music,
  PawPrint,
  PiggyBank,
  Plane,
  Popcorn,
  Receipt,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  TrendingUp,
  Tv,
  UtensilsCrossed,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Ícones disponíveis para categorias. A chave é o que fica salvo em category.icon.
export const CATEGORY_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  "shopping-cart": { icon: ShoppingCart, label: "Mercado" },
  house: { icon: House, label: "Casa" },
  zap: { icon: Zap, label: "Contas de casa" },
  receipt: { icon: Receipt, label: "Contas" },
  car: { icon: Car, label: "Carro" },
  fuel: { icon: Fuel, label: "Combustível" },
  bus: { icon: Bus, label: "Transporte" },
  utensils: { icon: UtensilsCrossed, label: "Restaurante" },
  coffee: { icon: Coffee, label: "Café" },
  popcorn: { icon: Popcorn, label: "Lazer" },
  gamepad: { icon: Gamepad2, label: "Jogos" },
  music: { icon: Music, label: "Música" },
  tv: { icon: Tv, label: "Assinaturas" },
  smartphone: { icon: Smartphone, label: "Celular" },
  heart: { icon: HeartPulse, label: "Saúde" },
  dumbbell: { icon: Dumbbell, label: "Academia" },
  graduation: { icon: GraduationCap, label: "Educação" },
  paw: { icon: PawPrint, label: "Pet" },
  baby: { icon: Baby, label: "Filhos" },
  shirt: { icon: Shirt, label: "Roupas" },
  bag: { icon: ShoppingBag, label: "Compras" },
  gift: { icon: Gift, label: "Presentes" },
  plane: { icon: Plane, label: "Viagem" },
  wrench: { icon: Wrench, label: "Manutenção" },
  briefcase: { icon: Briefcase, label: "Salário" },
  laptop: { icon: Laptop, label: "Freelas" },
  trending: { icon: TrendingUp, label: "Investimentos" },
  piggy: { icon: PiggyBank, label: "Reserva" },
  landmark: { icon: Landmark, label: "Banco" },
  "hand-coins": { icon: HandCoins, label: "Reembolso" },
  coins: { icon: Coins, label: "Renda extra" },
  sparkles: { icon: Sparkles, label: "Outros" },
};

export const FALLBACK_ICON = Tag;
export const UNCATEGORIZED_ICON = CircleDashed;

// Palavras do nome que sugerem um ícone (sem acento, minúsculas)
const SUGGESTIONS: [RegExp, string][] = [
  // Mais específicas primeiro: vale a primeira que casar ("plano de saúde" antes de "plano")
  [/saude|farmacia|remedio|medic|consulta|plano de saude|dentista/, "heart"],
  [/viagem|hotel|passagem aerea|ferias/, "plane"],
  [/mercado|supermerc|feira|hortifruti|padaria|acougue/, "shopping-cart"],
  [/aluguel|moradia|casa|condominio|apartamento|iptu/, "house"],
  [/luz|energia|agua|gas|internet/, "zap"],
  [/conta|boleto|imposto|taxa|tarifa/, "receipt"],
  [/combustivel|gasolina|posto|etanol/, "fuel"],
  [/carro|veiculo|ipva|estacionamento|seguro do carro/, "car"],
  [/transporte|onibus|metro|uber|taxi|passagem/, "bus"],
  [/restaurante|ifood|delivery|lanche|comida|almoco|jantar|alimentacao/, "utensils"],
  [/cafe|cafeteria|padoca/, "coffee"],
  [/lazer|cinema|show|passeio|diversao|bar/, "popcorn"],
  [/jogo|game|videogame/, "gamepad"],
  [/musica|spotify/, "music"],
  [/assinatura|streaming|netflix|tv/, "tv"],
  [/celular|telefone|plano/, "smartphone"],
  [/academia|esporte|treino|gym/, "dumbbell"],
  [/educacao|curso|escola|faculdade|livro|ingles/, "graduation"],
  [/pet|racao|veterinario|cachorro|gato/, "paw"],
  [/filho|bebe|crianca|fralda/, "baby"],
  [/roupa|vestuario|calcado|sapato/, "shirt"],
  [/compra|shopping|loja/, "bag"],
  [/presente|aniversario|doacao/, "gift"],
  [/manutencao|reforma|conserto|oficina/, "wrench"],
  [/salario|pagamento|trabalho|emprego/, "briefcase"],
  [/freela|freelance|projeto|servico/, "laptop"],
  [/investimento|rendimento|dividendo|acoes/, "trending"],
  [/reserva|poupanca|economia/, "piggy"],
  [/banco|juros|emprestimo|financiamento/, "landmark"],
  [/reembolso|estorno|devolucao/, "hand-coins"],
  [/extra|bonus|venda/, "coins"],
];

const normalize = (text: string) =>
  text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function suggestIcon(name: string): string | null {
  const text = normalize(name);
  return SUGGESTIONS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

// Ícone salvo; se não houver, o sugerido pelo nome; senão, uma etiqueta genérica
export function iconFor(category: { name: string; icon: string | null } | undefined): LucideIcon {
  if (!category) return UNCATEGORIZED_ICON;
  const key = category.icon ?? suggestIcon(category.name);
  return (key && CATEGORY_ICONS[key]?.icon) || FALLBACK_ICON;
}
