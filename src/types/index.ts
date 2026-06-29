export interface Compte {
  id: string;
  nom: string;
  type: string;
  soldeActuel: number;
  soldeInitial?: number;
  devise?: string;
}

export interface Categorie {
  id: string;
  nom: string;
  type: 'ENTREE' | 'DEPENSE';
}

export interface Transaction {
  id: string;
  montant: number;
  type: 'ENTREE' | 'DEPENSE' | 'SORTIE';
  description?: string;
  dateTransaction: string;
  sourcePaiement?: string;
  compteNom?: string;
  categorieNom?: string;
}

export interface Budget {
  id: string;
  montantLimite: number;
  montantDepense: number;
  dateDebut: string;
  dateFin: string;
  categorieNom?: string;
}

export interface Alerte {
  id: string;
  message: string;
  type: string;
  lue: boolean;
  creeLe: string;
}

export interface Profil {
  id: string;
  nom: string;
  email: string;
  role: string;
}
