export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      barns: {
        Row: {
          category: string | null
          created_at: string
          id: number
          name: string
          notes: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: number
          name: string
          notes?: string | null
          owner_id?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: number
          name?: string
          notes?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      breeding_history: {
        Row: {
          actual_kidding_date: string | null
          breeding_date: string
          buck_tag_number: string
          complications: string | null
          created_at: string | null
          doe_tag_number: string
          expected_kidding_date: string | null
          id: number
          notes: string | null
          number_of_female_kids: number | null
          number_of_male_kids: number | null
          pregnancy_confirmed: boolean | null
          total_kids: number | null
          updated_at: string | null
        }
        Insert: {
          actual_kidding_date?: string | null
          breeding_date: string
          buck_tag_number: string
          complications?: string | null
          created_at?: string | null
          doe_tag_number: string
          expected_kidding_date?: string | null
          id?: number
          notes?: string | null
          number_of_female_kids?: number | null
          number_of_male_kids?: number | null
          pregnancy_confirmed?: boolean | null
          total_kids?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_kidding_date?: string | null
          breeding_date?: string
          buck_tag_number?: string
          complications?: string | null
          created_at?: string | null
          doe_tag_number?: string
          expected_kidding_date?: string | null
          id?: number
          notes?: string | null
          number_of_female_kids?: number | null
          number_of_male_kids?: number | null
          pregnancy_confirmed?: boolean | null
          total_kids?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "breeding_history_buck_tag_number_fkey"
            columns: ["buck_tag_number"]
            isOneToOne: false
            referencedRelation: "goat_records"
            referencedColumns: ["tag_number"]
          },
          {
            foreignKeyName: "breeding_history_doe_tag_number_fkey"
            columns: ["doe_tag_number"]
            isOneToOne: false
            referencedRelation: "goat_records"
            referencedColumns: ["tag_number"]
          },
        ]
      }
      deworming: {
        Row: {
          created_at: string | null
          date_given: string
          goat_tag_number: string
          id: number
          medicine: string
          next_due_date: string | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_given: string
          goat_tag_number: string
          id?: number
          medicine: string
          next_due_date?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_given?: string
          goat_tag_number?: string
          id?: number
          medicine?: string
          next_due_date?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deworming_goat_tag_number_fkey"
            columns: ["goat_tag_number"]
            isOneToOne: false
            referencedRelation: "goat_records"
            referencedColumns: ["tag_number"]
          },
        ]
      }
      goat_barn_moves: {
        Row: {
          created_at: string
          from_barn_id: number | null
          goat_id: number
          id: number
          moved_on: string
          note: string | null
          owner_id: string
          to_barn_id: number | null
        }
        Insert: {
          created_at?: string
          from_barn_id?: number | null
          goat_id: number
          id?: number
          moved_on?: string
          note?: string | null
          owner_id?: string
          to_barn_id?: number | null
        }
        Update: {
          created_at?: string
          from_barn_id?: number | null
          goat_id?: number
          id?: number
          moved_on?: string
          note?: string | null
          owner_id?: string
          to_barn_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goat_barn_moves_from_barn_id_fkey"
            columns: ["from_barn_id"]
            isOneToOne: false
            referencedRelation: "barns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goat_barn_moves_goat_id_fkey"
            columns: ["goat_id"]
            isOneToOne: false
            referencedRelation: "goats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goat_barn_moves_to_barn_id_fkey"
            columns: ["to_barn_id"]
            isOneToOne: false
            referencedRelation: "barns"
            referencedColumns: ["id"]
          },
        ]
      }
      goat_breed_composition: {
        Row: {
          breed: string
          created_at: string
          goat_id: number
          id: number
          owner_id: string
          pct: number
        }
        Insert: {
          breed: string
          created_at?: string
          goat_id: number
          id?: number
          owner_id?: string
          pct: number
        }
        Update: {
          breed?: string
          created_at?: string
          goat_id?: number
          id?: number
          owner_id?: string
          pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "goat_breed_composition_goat_id_fkey"
            columns: ["goat_id"]
            isOneToOne: false
            referencedRelation: "goats"
            referencedColumns: ["id"]
          },
        ]
      }
      goat_records: {
        Row: {
          actual_kidding_date: string | null
          breed: string | null
          breeding_date: string | null
          castrated: boolean | null
          colour: string | null
          created_at: string | null
          current_status: string | null
          current_weight: number | null
          date_of_birth: string | null
          expected_kidding_date: string | null
          farm_location: string | null
          father_tag: string | null
          goat_name: string
          health_status: string | null
          id: number
          mother_tag: string | null
          notes: string | null
          number_of_kids_born: number | null
          purchase_date: string | null
          purchase_price: number | null
          serial_number: string | null
          sex: string | null
          tag_number: string
          updated_at: string | null
        }
        Insert: {
          actual_kidding_date?: string | null
          breed?: string | null
          breeding_date?: string | null
          castrated?: boolean | null
          colour?: string | null
          created_at?: string | null
          current_status?: string | null
          current_weight?: number | null
          date_of_birth?: string | null
          expected_kidding_date?: string | null
          farm_location?: string | null
          father_tag?: string | null
          goat_name: string
          health_status?: string | null
          id?: number
          mother_tag?: string | null
          notes?: string | null
          number_of_kids_born?: number | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          sex?: string | null
          tag_number: string
          updated_at?: string | null
        }
        Update: {
          actual_kidding_date?: string | null
          breed?: string | null
          breeding_date?: string | null
          castrated?: boolean | null
          colour?: string | null
          created_at?: string | null
          current_status?: string | null
          current_weight?: number | null
          date_of_birth?: string | null
          expected_kidding_date?: string | null
          farm_location?: string | null
          father_tag?: string | null
          goat_name?: string
          health_status?: string | null
          id?: number
          mother_tag?: string | null
          notes?: string | null
          number_of_kids_born?: number | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          sex?: string | null
          tag_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      goats: {
        Row: {
          barn_id: number | null
          breed: string | null
          created_at: string
          dam_id: number | null
          dam_name: string | null
          date_of_birth: string
          id: number
          name: string | null
          notes: string | null
          origin: Database["public"]["Enums"]["goat_origin"]
          owner_id: string
          photo_url: string | null
          purchase_date: string | null
          reproductive_state: Database["public"]["Enums"]["reproductive_state"]
          sex: Database["public"]["Enums"]["goat_sex"]
          sire_id: number | null
          sire_name: string | null
          status: Database["public"]["Enums"]["goat_status"]
          tag: string
          updated_at: string
        }
        Insert: {
          barn_id?: number | null
          breed?: string | null
          created_at?: string
          dam_id?: number | null
          dam_name?: string | null
          date_of_birth: string
          id?: number
          name?: string | null
          notes?: string | null
          origin?: Database["public"]["Enums"]["goat_origin"]
          owner_id?: string
          photo_url?: string | null
          purchase_date?: string | null
          reproductive_state?: Database["public"]["Enums"]["reproductive_state"]
          sex: Database["public"]["Enums"]["goat_sex"]
          sire_id?: number | null
          sire_name?: string | null
          status?: Database["public"]["Enums"]["goat_status"]
          tag: string
          updated_at?: string
        }
        Update: {
          barn_id?: number | null
          breed?: string | null
          created_at?: string
          dam_id?: number | null
          dam_name?: string | null
          date_of_birth?: string
          id?: number
          name?: string | null
          notes?: string | null
          origin?: Database["public"]["Enums"]["goat_origin"]
          owner_id?: string
          photo_url?: string | null
          purchase_date?: string | null
          reproductive_state?: Database["public"]["Enums"]["reproductive_state"]
          sex?: Database["public"]["Enums"]["goat_sex"]
          sire_id?: number | null
          sire_name?: string | null
          status?: Database["public"]["Enums"]["goat_status"]
          tag?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goats_barn_id_fkey"
            columns: ["barn_id"]
            isOneToOne: false
            referencedRelation: "barns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goats_dam_id_fkey"
            columns: ["dam_id"]
            isOneToOne: false
            referencedRelation: "goats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goats_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "goats"
            referencedColumns: ["id"]
          },
        ]
      }
      health_history: {
        Row: {
          created_at: string | null
          diagnosis: string | null
          goat_tag_number: string
          id: number
          notes: string | null
          record_date: string
          recovery_status: string | null
          symptoms: string | null
          temperature: number | null
          treatment: string | null
          updated_at: string | null
          veterinarian: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          diagnosis?: string | null
          goat_tag_number: string
          id?: number
          notes?: string | null
          record_date: string
          recovery_status?: string | null
          symptoms?: string | null
          temperature?: number | null
          treatment?: string | null
          updated_at?: string | null
          veterinarian?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          diagnosis?: string | null
          goat_tag_number?: string
          id?: number
          notes?: string | null
          record_date?: string
          recovery_status?: string | null
          symptoms?: string | null
          temperature?: number | null
          treatment?: string | null
          updated_at?: string | null
          veterinarian?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_history_goat_tag_number_fkey"
            columns: ["goat_tag_number"]
            isOneToOne: false
            referencedRelation: "goat_records"
            referencedColumns: ["tag_number"]
          },
        ]
      }
      medicine_records: {
        Row: {
          administered_by: string | null
          created_at: string | null
          dosage: string | null
          goat_tag_number: string
          id: number
          medicine_name: string
          next_dose_date: string | null
          notes: string | null
          purpose: string | null
          record_date: string
          updated_at: string | null
          withdrawal_period: string | null
        }
        Insert: {
          administered_by?: string | null
          created_at?: string | null
          dosage?: string | null
          goat_tag_number: string
          id?: number
          medicine_name: string
          next_dose_date?: string | null
          notes?: string | null
          purpose?: string | null
          record_date: string
          updated_at?: string | null
          withdrawal_period?: string | null
        }
        Update: {
          administered_by?: string | null
          created_at?: string | null
          dosage?: string | null
          goat_tag_number?: string
          id?: number
          medicine_name?: string
          next_dose_date?: string | null
          notes?: string | null
          purpose?: string | null
          record_date?: string
          updated_at?: string | null
          withdrawal_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicine_records_goat_tag_number_fkey"
            columns: ["goat_tag_number"]
            isOneToOne: false
            referencedRelation: "goat_records"
            referencedColumns: ["tag_number"]
          },
        ]
      }
      sales_purchases: {
        Row: {
          buyer_seller: string | null
          created_at: string | null
          goat_tag_number: string
          id: number
          notes: string | null
          price: number | null
          reason: string | null
          transaction_date: string
          transaction_type: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_seller?: string | null
          created_at?: string | null
          goat_tag_number: string
          id?: number
          notes?: string | null
          price?: number | null
          reason?: string | null
          transaction_date: string
          transaction_type?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_seller?: string | null
          created_at?: string | null
          goat_tag_number?: string
          id?: number
          notes?: string | null
          price?: number | null
          reason?: string | null
          transaction_date?: string
          transaction_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_purchases_goat_tag_number_fkey"
            columns: ["goat_tag_number"]
            isOneToOne: false
            referencedRelation: "goat_records"
            referencedColumns: ["tag_number"]
          },
        ]
      }
      vaccinations: {
        Row: {
          administered_by: string | null
          created_at: string | null
          date_given: string
          goat_tag_number: string
          id: number
          next_due_date: string | null
          notes: string | null
          updated_at: string | null
          vaccine_name: string
        }
        Insert: {
          administered_by?: string | null
          created_at?: string | null
          date_given: string
          goat_tag_number: string
          id?: number
          next_due_date?: string | null
          notes?: string | null
          updated_at?: string | null
          vaccine_name: string
        }
        Update: {
          administered_by?: string | null
          created_at?: string | null
          date_given?: string
          goat_tag_number?: string
          id?: number
          next_due_date?: string | null
          notes?: string | null
          updated_at?: string | null
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccinations_goat_tag_number_fkey"
            columns: ["goat_tag_number"]
            isOneToOne: false
            referencedRelation: "goat_records"
            referencedColumns: ["tag_number"]
          },
        ]
      }
      weight_history: {
        Row: {
          created_at: string | null
          goat_tag_number: string
          id: number
          notes: string | null
          record_date: string
          updated_at: string | null
          weight: number
          weight_change: number | null
        }
        Insert: {
          created_at?: string | null
          goat_tag_number: string
          id?: number
          notes?: string | null
          record_date: string
          updated_at?: string | null
          weight: number
          weight_change?: number | null
        }
        Update: {
          created_at?: string | null
          goat_tag_number?: string
          id?: number
          notes?: string | null
          record_date?: string
          updated_at?: string | null
          weight?: number
          weight_change?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weight_history_goat_tag_number_fkey"
            columns: ["goat_tag_number"]
            isOneToOne: false
            referencedRelation: "goat_records"
            referencedColumns: ["tag_number"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      goat_origin: "born_here" | "purchased"
      goat_sex: "male" | "female"
      goat_status: "active" | "sold" | "deceased"
      reproductive_state: "intact" | "castrated"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      goat_origin: ["born_here", "purchased"],
      goat_sex: ["male", "female"],
      goat_status: ["active", "sold", "deceased"],
      reproductive_state: ["intact", "castrated"],
    },
  },
} as const
