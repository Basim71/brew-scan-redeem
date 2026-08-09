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
      ai_suggestions: {
        Row: {
          approved_by: string | null
          audience: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          model: string | null
          payload: Json
          provider: string | null
          session_id: string | null
          status: string
          ticket_id: string | null
        }
        Insert: {
          approved_by?: string | null
          audience?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          model?: string | null
          payload?: Json
          provider?: string | null
          session_id?: string | null
          status?: string
          ticket_id?: string | null
        }
        Update: {
          approved_by?: string | null
          audience?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          model?: string | null
          payload?: Json
          provider?: string | null
          session_id?: string | null
          status?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ticket_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address_ar: string | null
          address_en: string | null
          branch_code: string | null
          closing_time: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          maps_url: string | null
          name_ar: string
          name_en: string
          opening_time: string
          organization_id: string
          phone: string | null
          qr_token: string
          updated_at: string
          working_days: string[]
        }
        Insert: {
          address_ar?: string | null
          address_en?: string | null
          branch_code?: string | null
          closing_time?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          maps_url?: string | null
          name_ar: string
          name_en: string
          opening_time?: string
          organization_id?: string
          phone?: string | null
          qr_token?: string
          updated_at?: string
          working_days?: string[]
        }
        Update: {
          address_ar?: string | null
          address_en?: string | null
          branch_code?: string | null
          closing_time?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          maps_url?: string | null
          name_ar?: string
          name_en?: string
          opening_time?: string
          organization_id?: string
          phone?: string | null
          qr_token?: string
          updated_at?: string
          working_days?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          branch_id: string | null
          code: string
          created_at: string
          id: string
          organization_id: string
          plan_id: string
          price: number
          sold_at: string | null
          status: Database["public"]["Enums"]["coupon_status"]
        }
        Insert: {
          branch_id?: string | null
          code: string
          created_at?: string
          id?: string
          organization_id?: string
          plan_id: string
          price: number
          sold_at?: string | null
          status?: Database["public"]["Enums"]["coupon_status"]
        }
        Update: {
          branch_id?: string | null
          code?: string
          created_at?: string
          id?: string
          organization_id?: string
          plan_id?: string
          price?: number
          sold_at?: string | null
          status?: Database["public"]["Enums"]["coupon_status"]
        }
        Relationships: [
          {
            foreignKeyName: "coupons_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_devices: {
        Row: {
          branch_id: string
          created_at: string
          customer_id: string | null
          device_token: string
          id: string
          last_seen_at: string
          organization_id: string
          preferred_language: string
          user_agent: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          customer_id?: string | null
          device_token: string
          id?: string
          last_seen_at?: string
          organization_id?: string
          preferred_language?: string
          user_agent?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          customer_id?: string | null
          device_token?: string
          id?: string
          last_seen_at?: string
          organization_id?: string
          preferred_language?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_devices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_devices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_success_case_events: {
        Row: {
          actor_user_id: string | null
          case_id: string
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          metadata: Json
          to_status: string | null
        }
        Insert: {
          actor_user_id?: string | null
          case_id: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          metadata?: Json
          to_status?: string | null
        }
        Update: {
          actor_user_id?: string | null
          case_id?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_success_case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "customer_success_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_success_case_messages: {
        Row: {
          body: string
          case_id: string
          created_at: string
          edited_at: string | null
          id: string
          sender_user_id: string
          visibility: string
        }
        Insert: {
          body: string
          case_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          sender_user_id?: string
          visibility?: string
        }
        Update: {
          body?: string
          case_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          sender_user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_success_case_messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "customer_success_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_success_cases: {
        Row: {
          allow_recording: boolean
          allow_temporary_edit: boolean
          allow_view: boolean
          allow_voice: boolean
          assigned_platform_member_id: string | null
          case_number: string
          category: string
          closed_at: string | null
          created_at: string
          created_by_member_id: string
          description: string
          first_response_at: string | null
          id: string
          organization_id: string
          priority: string
          requested_at: string
          resolved_at: string | null
          scheduled_at: string | null
          session_preference: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          allow_recording?: boolean
          allow_temporary_edit?: boolean
          allow_view?: boolean
          allow_voice?: boolean
          assigned_platform_member_id?: string | null
          case_number?: string
          category: string
          closed_at?: string | null
          created_at?: string
          created_by_member_id: string
          description: string
          first_response_at?: string | null
          id?: string
          organization_id: string
          priority?: string
          requested_at?: string
          resolved_at?: string | null
          scheduled_at?: string | null
          session_preference?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          allow_recording?: boolean
          allow_temporary_edit?: boolean
          allow_view?: boolean
          allow_voice?: boolean
          assigned_platform_member_id?: string | null
          case_number?: string
          category?: string
          closed_at?: string | null
          created_at?: string
          created_by_member_id?: string
          description?: string
          first_response_at?: string | null
          id?: string
          organization_id?: string
          priority?: string
          requested_at?: string
          resolved_at?: string | null
          scheduled_at?: string | null
          session_preference?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_success_cases_assigned_platform_member_id_fkey"
            columns: ["assigned_platform_member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_success_cases_assigned_platform_member_id_fkey"
            columns: ["assigned_platform_member_id"]
            isOneToOne: false
            referencedRelation: "platform_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_success_cases_created_by_member_id_fkey"
            columns: ["created_by_member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_success_cases_created_by_member_id_fkey"
            columns: ["created_by_member_id"]
            isOneToOne: false
            referencedRelation: "platform_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_success_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_success_feedback: {
        Row: {
          case_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          resolved: boolean
          submitted_by_member_id: string
        }
        Insert: {
          case_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          resolved: boolean
          submitted_by_member_id: string
        }
        Update: {
          case_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          resolved?: boolean
          submitted_by_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_success_feedback_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "customer_success_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_success_feedback_submitted_by_member_id_fkey"
            columns: ["submitted_by_member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_success_feedback_submitted_by_member_id_fkey"
            columns: ["submitted_by_member_id"]
            isOneToOne: false
            referencedRelation: "platform_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id?: string
          phone: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drink_option_groups: {
        Row: {
          created_at: string
          drink_type_id: string
          id: string
          is_required: boolean
          name_ar: string
          name_en: string
          organization_id: string
          selection_type: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          drink_type_id: string
          id?: string
          is_required?: boolean
          name_ar: string
          name_en: string
          organization_id?: string
          selection_type?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          drink_type_id?: string
          id?: string
          is_required?: boolean
          name_ar?: string
          name_en?: string
          organization_id?: string
          selection_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "drink_option_groups_drink_type_id_fkey"
            columns: ["drink_type_id"]
            isOneToOne: false
            referencedRelation: "drink_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drink_option_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drink_options: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          organization_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          organization_id?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          organization_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "drink_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "drink_option_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drink_options_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drink_types: {
        Row: {
          allergens: string[]
          calories: number | null
          created_at: string
          id: string
          image_path: string | null
          image_url: string | null
          is_active: boolean
          name_ar: string
          name_en: string
          organization_id: string
        }
        Insert: {
          allergens?: string[]
          calories?: number | null
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_active?: boolean
          name_ar: string
          name_en: string
          organization_id?: string
        }
        Update: {
          allergens?: string[]
          calories?: number | null
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_active?: boolean
          name_ar?: string
          name_en?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drink_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_articles: {
        Row: {
          body_ar: string
          body_en: string | null
          category: string
          created_at: string
          excerpt_ar: string | null
          excerpt_en: string | null
          id: string
          is_published: boolean
          slug: string
          tags: string[]
          title_ar: string
          title_en: string | null
          updated_at: string
          video_url: string | null
          views: number
        }
        Insert: {
          body_ar?: string
          body_en?: string | null
          category?: string
          created_at?: string
          excerpt_ar?: string | null
          excerpt_en?: string | null
          id?: string
          is_published?: boolean
          slug: string
          tags?: string[]
          title_ar: string
          title_en?: string | null
          updated_at?: string
          video_url?: string | null
          views?: number
        }
        Update: {
          body_ar?: string
          body_en?: string | null
          category?: string
          created_at?: string
          excerpt_ar?: string | null
          excerpt_en?: string | null
          id?: string
          is_published?: boolean
          slug?: string
          tags?: string[]
          title_ar?: string
          title_en?: string | null
          updated_at?: string
          video_url?: string | null
          views?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          approved_at: string | null
          branch_id: string
          cashier_id: string | null
          created_at: string
          customer_id: string
          customer_note: string | null
          drink_type_id: string
          id: string
          order_date: string
          organization_id: string
          rejected_at: string | null
          requested_at: string
          selected_options: Json
          status: Database["public"]["Enums"]["order_status"]
          subscription_id: string
        }
        Insert: {
          approved_at?: string | null
          branch_id: string
          cashier_id?: string | null
          created_at?: string
          customer_id: string
          customer_note?: string | null
          drink_type_id: string
          id?: string
          order_date?: string
          organization_id?: string
          rejected_at?: string | null
          requested_at?: string
          selected_options?: Json
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id: string
        }
        Update: {
          approved_at?: string | null
          branch_id?: string
          cashier_id?: string | null
          created_at?: string
          customer_id?: string
          customer_note?: string | null
          drink_type_id?: string
          id?: string
          order_date?: string
          organization_id?: string
          rejected_at?: string | null
          requested_at?: string
          selected_options?: Json
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_drink_type_id_fkey"
            columns: ["drink_type_id"]
            isOneToOne: false
            referencedRelation: "drink_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_activity_log: {
        Row: {
          action: string
          actor_label: string | null
          actor_user_id: string | null
          category: string
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json
          organization_id: string
          severity: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_label?: string | null
          actor_user_id?: string | null
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          organization_id: string
          severity?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_label?: string | null
          actor_user_id?: string | null
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          organization_id?: string
          severity?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_activity_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          job_title: string | null
          last_login_at: string | null
          organization_id: string
          permissions: Json
          phone: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          job_title?: string | null
          last_login_at?: string | null
          organization_id: string
          permissions?: Json
          phone?: string | null
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          job_title?: string | null
          last_login_at?: string | null
          organization_id?: string
          permissions?: Json
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          address: string | null
          allow_multiple_active_orders: boolean
          allowed_countries: string[]
          allowed_ip_addresses: string[]
          audit_log_enabled: boolean
          auto_logout_enabled: boolean
          auto_renewal: boolean
          background_url: string | null
          branch_qr_mode: string
          closing_time: string
          commercial_registration: string | null
          created_at: string
          currency: string
          customer_comments_enabled: boolean
          customer_registration_enabled: boolean
          date_format: string
          default_activation: string
          default_bonus_days: number
          default_branch_id: string | null
          default_employee_role: string
          default_language: string
          default_payment_method: string
          device_restriction: string
          employee_invite_mode: string
          empty_subscription_message_ar: string | null
          empty_subscription_message_en: string | null
          expiration_grace_days: number
          expired_subscription_message_ar: string | null
          expired_subscription_message_en: string | null
          failed_login_protection: boolean
          failed_login_threshold: number
          force_password_reset_days: number
          holiday_exceptions: Json
          integrations: Json
          invoice_next_number: number
          invoice_prefix: string
          login_restriction: string
          logo_url: string | null
          loyalty_message_ar: string | null
          loyalty_message_en: string | null
          max_concurrent_sessions: number
          membership_auto_notifications: boolean
          notification_events: Json
          notification_providers: Json
          notification_templates: Json
          notify_email: boolean
          notify_low_stock: boolean
          notify_orders: boolean
          notify_push: boolean
          notify_sms: boolean
          notify_subscription_expiry: boolean
          notify_training: boolean
          notify_whatsapp: boolean
          number_format: string
          one_drink_per_day: boolean
          opening_time: string
          order_completed_message_ar: string | null
          order_completed_message_en: string | null
          order_number_format: string
          order_prep_minutes: number
          organization_id: string
          password_policy: string
          password_reset_policy: string
          payment_methods: string[]
          primary_color: string | null
          queue_behavior: string
          receipt_footer_ar: string | null
          receipt_footer_en: string | null
          receipt_logo_url: string | null
          receipt_show_vat: boolean
          redeem_success_message_ar: string | null
          redeem_success_message_en: string | null
          remember_devices: boolean
          renewal_reminder_days: number
          sales_channel_cashier: boolean
          sales_channel_customer_app: boolean
          sales_channel_external_api: boolean
          sales_channel_website: boolean
          secondary_color: string | null
          session_timeout_minutes: number
          suspicious_login_detection: boolean
          tax_enabled: boolean
          tax_included: boolean
          tax_number: string | null
          tax_percentage: number
          temporary_lock_minutes: number
          thank_you_message_ar: string | null
          thank_you_message_en: string | null
          timezone: string
          two_factor_required: boolean
          updated_at: string
          welcome_message_ar: string | null
          welcome_message_en: string | null
          welcome_subtitle_ar: string | null
          welcome_subtitle_en: string | null
          working_days: string[]
        }
        Insert: {
          address?: string | null
          allow_multiple_active_orders?: boolean
          allowed_countries?: string[]
          allowed_ip_addresses?: string[]
          audit_log_enabled?: boolean
          auto_logout_enabled?: boolean
          auto_renewal?: boolean
          background_url?: string | null
          branch_qr_mode?: string
          closing_time?: string
          commercial_registration?: string | null
          created_at?: string
          currency?: string
          customer_comments_enabled?: boolean
          customer_registration_enabled?: boolean
          date_format?: string
          default_activation?: string
          default_bonus_days?: number
          default_branch_id?: string | null
          default_employee_role?: string
          default_language?: string
          default_payment_method?: string
          device_restriction?: string
          employee_invite_mode?: string
          empty_subscription_message_ar?: string | null
          empty_subscription_message_en?: string | null
          expiration_grace_days?: number
          expired_subscription_message_ar?: string | null
          expired_subscription_message_en?: string | null
          failed_login_protection?: boolean
          failed_login_threshold?: number
          force_password_reset_days?: number
          holiday_exceptions?: Json
          integrations?: Json
          invoice_next_number?: number
          invoice_prefix?: string
          login_restriction?: string
          logo_url?: string | null
          loyalty_message_ar?: string | null
          loyalty_message_en?: string | null
          max_concurrent_sessions?: number
          membership_auto_notifications?: boolean
          notification_events?: Json
          notification_providers?: Json
          notification_templates?: Json
          notify_email?: boolean
          notify_low_stock?: boolean
          notify_orders?: boolean
          notify_push?: boolean
          notify_sms?: boolean
          notify_subscription_expiry?: boolean
          notify_training?: boolean
          notify_whatsapp?: boolean
          number_format?: string
          one_drink_per_day?: boolean
          opening_time?: string
          order_completed_message_ar?: string | null
          order_completed_message_en?: string | null
          order_number_format?: string
          order_prep_minutes?: number
          organization_id: string
          password_policy?: string
          password_reset_policy?: string
          payment_methods?: string[]
          primary_color?: string | null
          queue_behavior?: string
          receipt_footer_ar?: string | null
          receipt_footer_en?: string | null
          receipt_logo_url?: string | null
          receipt_show_vat?: boolean
          redeem_success_message_ar?: string | null
          redeem_success_message_en?: string | null
          remember_devices?: boolean
          renewal_reminder_days?: number
          sales_channel_cashier?: boolean
          sales_channel_customer_app?: boolean
          sales_channel_external_api?: boolean
          sales_channel_website?: boolean
          secondary_color?: string | null
          session_timeout_minutes?: number
          suspicious_login_detection?: boolean
          tax_enabled?: boolean
          tax_included?: boolean
          tax_number?: string | null
          tax_percentage?: number
          temporary_lock_minutes?: number
          thank_you_message_ar?: string | null
          thank_you_message_en?: string | null
          timezone?: string
          two_factor_required?: boolean
          updated_at?: string
          welcome_message_ar?: string | null
          welcome_message_en?: string | null
          welcome_subtitle_ar?: string | null
          welcome_subtitle_en?: string | null
          working_days?: string[]
        }
        Update: {
          address?: string | null
          allow_multiple_active_orders?: boolean
          allowed_countries?: string[]
          allowed_ip_addresses?: string[]
          audit_log_enabled?: boolean
          auto_logout_enabled?: boolean
          auto_renewal?: boolean
          background_url?: string | null
          branch_qr_mode?: string
          closing_time?: string
          commercial_registration?: string | null
          created_at?: string
          currency?: string
          customer_comments_enabled?: boolean
          customer_registration_enabled?: boolean
          date_format?: string
          default_activation?: string
          default_bonus_days?: number
          default_branch_id?: string | null
          default_employee_role?: string
          default_language?: string
          default_payment_method?: string
          device_restriction?: string
          employee_invite_mode?: string
          empty_subscription_message_ar?: string | null
          empty_subscription_message_en?: string | null
          expiration_grace_days?: number
          expired_subscription_message_ar?: string | null
          expired_subscription_message_en?: string | null
          failed_login_protection?: boolean
          failed_login_threshold?: number
          force_password_reset_days?: number
          holiday_exceptions?: Json
          integrations?: Json
          invoice_next_number?: number
          invoice_prefix?: string
          login_restriction?: string
          logo_url?: string | null
          loyalty_message_ar?: string | null
          loyalty_message_en?: string | null
          max_concurrent_sessions?: number
          membership_auto_notifications?: boolean
          notification_events?: Json
          notification_providers?: Json
          notification_templates?: Json
          notify_email?: boolean
          notify_low_stock?: boolean
          notify_orders?: boolean
          notify_push?: boolean
          notify_sms?: boolean
          notify_subscription_expiry?: boolean
          notify_training?: boolean
          notify_whatsapp?: boolean
          number_format?: string
          one_drink_per_day?: boolean
          opening_time?: string
          order_completed_message_ar?: string | null
          order_completed_message_en?: string | null
          order_number_format?: string
          order_prep_minutes?: number
          organization_id?: string
          password_policy?: string
          password_reset_policy?: string
          payment_methods?: string[]
          primary_color?: string | null
          queue_behavior?: string
          receipt_footer_ar?: string | null
          receipt_footer_en?: string | null
          receipt_logo_url?: string | null
          receipt_show_vat?: boolean
          redeem_success_message_ar?: string | null
          redeem_success_message_en?: string | null
          remember_devices?: boolean
          renewal_reminder_days?: number
          sales_channel_cashier?: boolean
          sales_channel_customer_app?: boolean
          sales_channel_external_api?: boolean
          sales_channel_website?: boolean
          secondary_color?: string | null
          session_timeout_minutes?: number
          suspicious_login_detection?: boolean
          tax_enabled?: boolean
          tax_included?: boolean
          tax_number?: string | null
          tax_percentage?: number
          temporary_lock_minutes?: number
          thank_you_message_ar?: string | null
          thank_you_message_en?: string | null
          timezone?: string
          two_factor_required?: boolean
          updated_at?: string
          welcome_message_ar?: string | null
          welcome_message_en?: string | null
          welcome_subtitle_ar?: string | null
          welcome_subtitle_en?: string | null
          working_days?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_default_branch_id_fkey"
            columns: ["default_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings_audit: {
        Row: {
          actor_user_id: string | null
          created_at: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          organization_id: string
          section: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          organization_id: string
          section: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          organization_id?: string
          section?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name_ar: string
          name_en: string | null
          organization_code: string
          organization_type: string
          owner_user_id: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name_ar: string
          name_en?: string | null
          organization_code: string
          organization_type?: string
          owner_user_id?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name_ar?: string
          name_en?: string | null
          organization_code?: string
          organization_type?: string
          owner_user_id?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      plan_allowed_branches: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          mode: string
          organization_id: string
          plan_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          mode?: string
          organization_id: string
          plan_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          mode?: string
          organization_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_allowed_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_allowed_branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_allowed_branches_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_allowed_drinks: {
        Row: {
          created_at: string
          drink_type_id: string
          id: string
          organization_id: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          drink_type_id: string
          id?: string
          organization_id: string
          plan_id: string
        }
        Update: {
          created_at?: string
          drink_type_id?: string
          id?: string
          organization_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_allowed_drinks_drink_type_id_fkey"
            columns: ["drink_type_id"]
            isOneToOne: false
            referencedRelation: "drink_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_allowed_drinks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_allowed_drinks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          allow_comments: boolean
          allow_extra_shot: boolean
          allow_milk: boolean
          allow_sugar: boolean
          allow_syrup: boolean
          allowed_weekdays: number[]
          archived_at: string | null
          auto_renewal: boolean
          badge: string | null
          bonus_days: number
          carry_unused: boolean
          color: string
          created_at: string
          currency: string
          description_ar: string | null
          description_en: string | null
          display_order: number
          drinks_per_redemption: number
          duration_days: number
          id: string
          is_active: boolean
          is_hidden: boolean
          max_addons: number | null
          max_carry_days: number | null
          max_drinks_per_day: number
          max_drinks_per_redemption: number
          max_redemptions_per_period: number | null
          max_selectable_drinks: number | null
          name: string
          name_ar: string
          name_en: string
          organization_id: string
          price: number
          redemption_frequency: string
          redemption_frequency_days: number | null
          redemption_window_end: string | null
          redemption_window_start: string | null
        }
        Insert: {
          allow_comments?: boolean
          allow_extra_shot?: boolean
          allow_milk?: boolean
          allow_sugar?: boolean
          allow_syrup?: boolean
          allowed_weekdays?: number[]
          archived_at?: string | null
          auto_renewal?: boolean
          badge?: string | null
          bonus_days?: number
          carry_unused?: boolean
          color?: string
          created_at?: string
          currency?: string
          description_ar?: string | null
          description_en?: string | null
          display_order?: number
          drinks_per_redemption?: number
          duration_days: number
          id?: string
          is_active?: boolean
          is_hidden?: boolean
          max_addons?: number | null
          max_carry_days?: number | null
          max_drinks_per_day?: number
          max_drinks_per_redemption?: number
          max_redemptions_per_period?: number | null
          max_selectable_drinks?: number | null
          name: string
          name_ar: string
          name_en: string
          organization_id?: string
          price: number
          redemption_frequency?: string
          redemption_frequency_days?: number | null
          redemption_window_end?: string | null
          redemption_window_start?: string | null
        }
        Update: {
          allow_comments?: boolean
          allow_extra_shot?: boolean
          allow_milk?: boolean
          allow_sugar?: boolean
          allow_syrup?: boolean
          allowed_weekdays?: number[]
          archived_at?: string | null
          auto_renewal?: boolean
          badge?: string | null
          bonus_days?: number
          carry_unused?: boolean
          color?: string
          created_at?: string
          currency?: string
          description_ar?: string | null
          description_en?: string | null
          display_order?: number
          drinks_per_redemption?: number
          duration_days?: number
          id?: string
          is_active?: boolean
          is_hidden?: boolean
          max_addons?: number | null
          max_carry_days?: number | null
          max_drinks_per_day?: number
          max_drinks_per_redemption?: number
          max_redemptions_per_period?: number | null
          max_selectable_drinks?: number | null
          name?: string
          name_ar?: string
          name_en?: string
          organization_id?: string
          price?: number
          redemption_frequency?: string
          redemption_frequency_days?: number | null
          redemption_window_end?: string | null
          redemption_window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_ai_settings: {
        Row: {
          base_url: string | null
          enabled: boolean
          id: string
          model: string
          options: Json
          provider: string
          require_human_approval: boolean
          temperature: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_url?: string | null
          enabled?: boolean
          id?: string
          model?: string
          options?: Json
          provider?: string
          require_human_approval?: boolean
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_url?: string | null
          enabled?: boolean
          id?: string
          model?: string
          options?: Json
          provider?: string
          require_human_approval?: boolean
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          branch_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string
          created_at: string
          device_token: string
          first_name: string
          id: string
          last_name: string
          organization_id: string
          phone: string
          preferred_language: string
          rejected_at: string | null
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id: string
          created_at?: string
          device_token: string
          first_name: string
          id?: string
          last_name: string
          organization_id?: string
          phone: string
          preferred_language?: string
          rejected_at?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string
          created_at?: string
          device_token?: string
          first_name?: string
          id?: string
          last_name?: string
          organization_id?: string
          phone?: string
          preferred_language?: string
          rejected_at?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      session_permissions: {
        Row: {
          created_at: string
          expires_at: string | null
          granted: boolean
          granted_at: string | null
          granted_by_user_id: string | null
          id: string
          permission: string
          revoked_at: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted?: boolean
          granted_at?: string | null
          granted_by_user_id?: string | null
          id?: string
          permission: string
          revoked_at?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted?: boolean
          granted_at?: string | null
          granted_by_user_id?: string | null
          id?: string
          permission?: string
          revoked_at?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_permissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ticket_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_signals: {
        Row: {
          created_at: string
          id: number
          kind: string
          payload: Json
          sender_user_id: string
          session_id: string
          target_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          kind: string
          payload?: Json
          sender_user_id: string
          session_id: string
          target_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          kind?: string
          payload?: Json
          sender_user_id?: string
          session_id?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_signals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ticket_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          bonus_days: number
          branch_id: string
          coupon_id: string
          created_at: string
          customer_id: string
          end_date: string
          id: string
          organization_id: string
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
        }
        Insert: {
          bonus_days?: number
          branch_id: string
          coupon_id: string
          created_at?: string
          customer_id: string
          end_date: string
          id?: string
          organization_id?: string
          plan_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
        }
        Update: {
          bonus_days?: number
          branch_id?: string
          coupon_id?: string
          created_at?: string
          customer_id?: string
          end_date?: string
          id?: string
          organization_id?: string
          plan_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: true
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_activity_log: {
        Row: {
          action: string
          actor_user_id: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: number
          metadata: Json
          session_id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: never
          metadata?: Json
          session_id: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: never
          metadata?: Json
          session_id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_activity_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "support_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_agents: {
        Row: {
          agent_role: string
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          max_concurrent_sessions: number
          member_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_role?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          max_concurrent_sessions?: number
          member_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_role?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          max_concurrent_sessions?: number
          member_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_agents_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_agents_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "platform_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachments: Json
          created_at: string
          id: string
          message: string
          sender_id: string
          session_id: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          id?: string
          message: string
          sender_id: string
          session_id: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "support_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_presence: {
        Row: {
          current_session_id: string | null
          current_ticket_id: string | null
          last_seen_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          current_session_id?: string | null
          current_ticket_id?: string | null
          last_seen_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          current_session_id?: string | null
          current_ticket_id?: string | null
          last_seen_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          allow_recording: boolean
          allow_voice: boolean
          assigned_platform_member_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          description: string | null
          duration_minutes: number
          id: string
          organization_id: string
          priority: Database["public"]["Enums"]["support_priority"]
          requested_by: string
          requested_mode: Database["public"]["Enums"]["support_session_mode"]
          requested_start_at: string | null
          reschedule_note: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["support_request_status"]
          subject: string
          type: Database["public"]["Enums"]["support_request_type"]
          updated_at: string
        }
        Insert: {
          allow_recording?: boolean
          allow_voice?: boolean
          assigned_platform_member_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          organization_id: string
          priority?: Database["public"]["Enums"]["support_priority"]
          requested_by: string
          requested_mode?: Database["public"]["Enums"]["support_session_mode"]
          requested_start_at?: string | null
          reschedule_note?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["support_request_status"]
          subject: string
          type: Database["public"]["Enums"]["support_request_type"]
          updated_at?: string
        }
        Update: {
          allow_recording?: boolean
          allow_voice?: boolean
          assigned_platform_member_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["support_priority"]
          requested_by?: string
          requested_mode?: Database["public"]["Enums"]["support_session_mode"]
          requested_start_at?: string | null
          reschedule_note?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["support_request_status"]
          subject?: string
          type?: Database["public"]["Enums"]["support_request_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_assigned_platform_member_id_fkey"
            columns: ["assigned_platform_member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_requests_assigned_platform_member_id_fkey"
            columns: ["assigned_platform_member_id"]
            isOneToOne: false
            referencedRelation: "platform_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_session_participants: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          participant_type: string
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          participant_type: string
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          participant_type?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "support_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_sessions: {
        Row: {
          approval_expires_at: string | null
          approved_by_company_user_id: string
          created_at: string
          current_path: string | null
          end_reason: string | null
          ended_at: string | null
          id: string
          mode: Database["public"]["Enums"]["support_session_mode"]
          organization_id: string
          platform_member_id: string
          recording_enabled: boolean
          request_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["support_session_status"]
          updated_at: string
          voice_enabled: boolean
        }
        Insert: {
          approval_expires_at?: string | null
          approved_by_company_user_id: string
          created_at?: string
          current_path?: string | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["support_session_mode"]
          organization_id: string
          platform_member_id: string
          recording_enabled?: boolean
          request_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["support_session_status"]
          updated_at?: string
          voice_enabled?: boolean
        }
        Update: {
          approval_expires_at?: string | null
          approved_by_company_user_id?: string
          created_at?: string
          current_path?: string | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["support_session_mode"]
          organization_id?: string
          platform_member_id?: string
          recording_enabled?: boolean
          request_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["support_session_status"]
          updated_at?: string
          voice_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "support_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_sessions_platform_member_id_fkey"
            columns: ["platform_member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_sessions_platform_member_id_fkey"
            columns: ["platform_member_id"]
            isOneToOne: false
            referencedRelation: "platform_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_sessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "support_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_events: {
        Row: {
          actor_kind: string
          actor_user_id: string | null
          created_at: string
          event_type: string
          from_status: string | null
          id: number
          message: string | null
          metadata: Json
          session_id: string | null
          ticket_id: string
          to_status: string | null
        }
        Insert: {
          actor_kind?: string
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: number
          message?: string | null
          metadata?: Json
          session_id?: string | null
          ticket_id: string
          to_status?: string | null
        }
        Update: {
          actor_kind?: string
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: number
          message?: string | null
          metadata?: Json
          session_id?: string | null
          ticket_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ticket_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_files: {
        Row: {
          bucket: string
          created_at: string
          file_name: string
          id: string
          kind: string
          message_id: string | null
          mime_type: string | null
          path: string
          size_bytes: number | null
          ticket_id: string
          uploaded_by: string | null
        }
        Insert: {
          bucket?: string
          created_at?: string
          file_name: string
          id?: string
          kind?: string
          message_id?: string | null
          mime_type?: string | null
          path: string
          size_bytes?: number | null
          ticket_id: string
          uploaded_by?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          message_id?: string | null
          mime_type?: string | null
          path?: string
          size_bytes?: number | null
          ticket_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_files_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_files_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: Json
          body: string
          created_at: string
          edited_at: string | null
          id: string
          kind: string
          language: string | null
          metadata: Json
          sender_kind: string
          sender_user_id: string | null
          session_id: string | null
          ticket_id: string
          visibility: string
        }
        Insert: {
          attachments?: Json
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          kind?: string
          language?: string | null
          metadata?: Json
          sender_kind?: string
          sender_user_id?: string | null
          session_id?: string | null
          ticket_id: string
          visibility?: string
        }
        Update: {
          attachments?: Json
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          kind?: string
          language?: string | null
          metadata?: Json
          sender_kind?: string
          sender_user_id?: string | null
          session_id?: string | null
          ticket_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_notes: {
        Row: {
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          session_id: string | null
          source: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          session_id?: string | null
          source?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          session_id?: string | null
          source?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ticket_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          resolved: boolean
          submitted_by_user_id: string | null
          ticket_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          resolved?: boolean
          submitted_by_user_id?: string | null
          ticket_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          resolved?: boolean
          submitted_by_user_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_ratings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_recordings: {
        Row: {
          bucket: string
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          id: string
          includes_audio: boolean
          includes_chat: boolean
          includes_input: boolean
          includes_video: boolean
          path: string | null
          session_id: string | null
          size_bytes: number | null
          status: string
          ticket_id: string
          timeline: Json
        }
        Insert: {
          bucket?: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          includes_audio?: boolean
          includes_chat?: boolean
          includes_input?: boolean
          includes_video?: boolean
          path?: string | null
          session_id?: string | null
          size_bytes?: number | null
          status?: string
          ticket_id: string
          timeline?: Json
        }
        Update: {
          bucket?: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          includes_audio?: boolean
          includes_chat?: boolean
          includes_input?: boolean
          includes_video?: boolean
          path?: string | null
          session_id?: string | null
          size_bytes?: number | null
          status?: string
          ticket_id?: string
          timeline?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ticket_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ticket_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_recordings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_sessions: {
        Row: {
          agent_user_id: string
          approval_expires_at: string | null
          approved_at: string | null
          approved_by_user_id: string | null
          created_at: string
          current_path: string | null
          end_reason: string | null
          ended_at: string | null
          id: string
          mode: string
          organization_id: string
          recording_active: boolean
          rejected_at: string | null
          remote_control_active: boolean
          requested_at: string
          screen_share_active: boolean
          started_at: string | null
          status: string
          ticket_id: string
          transferred_from_user_id: string | null
          updated_at: string
          video_active: boolean
          voice_active: boolean
        }
        Insert: {
          agent_user_id: string
          approval_expires_at?: string | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          current_path?: string | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          mode?: string
          organization_id: string
          recording_active?: boolean
          rejected_at?: string | null
          remote_control_active?: boolean
          requested_at?: string
          screen_share_active?: boolean
          started_at?: string | null
          status?: string
          ticket_id: string
          transferred_from_user_id?: string | null
          updated_at?: string
          video_active?: boolean
          voice_active?: boolean
        }
        Update: {
          agent_user_id?: string
          approval_expires_at?: string | null
          approved_at?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          current_path?: string | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          mode?: string
          organization_id?: string
          recording_active?: boolean
          rejected_at?: string | null
          remote_control_active?: boolean
          requested_at?: string
          screen_share_active?: boolean
          started_at?: string | null
          status?: string
          ticket_id?: string
          transferred_from_user_id?: string | null
          updated_at?: string
          video_active?: boolean
          voice_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ticket_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sessions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          ai_duplicate_of: string | null
          ai_suggested_category: string | null
          ai_suggested_priority: string | null
          ai_summary: string | null
          allow_recording: boolean
          allow_remote_control: boolean
          allow_view: boolean
          allow_voice: boolean
          assigned_agent_user_id: string | null
          assigned_at: string | null
          branch_id: string | null
          category: string
          closed_at: string | null
          context: Json
          created_at: string
          created_by_member_id: string | null
          created_by_user_id: string | null
          description: string
          first_response_at: string | null
          id: string
          legacy_case_id: string | null
          organization_id: string
          priority: string
          resolved_at: string | null
          scheduled_at: string | null
          session_preference: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          ai_duplicate_of?: string | null
          ai_suggested_category?: string | null
          ai_suggested_priority?: string | null
          ai_summary?: string | null
          allow_recording?: boolean
          allow_remote_control?: boolean
          allow_view?: boolean
          allow_voice?: boolean
          assigned_agent_user_id?: string | null
          assigned_at?: string | null
          branch_id?: string | null
          category?: string
          closed_at?: string | null
          context?: Json
          created_at?: string
          created_by_member_id?: string | null
          created_by_user_id?: string | null
          description?: string
          first_response_at?: string | null
          id?: string
          legacy_case_id?: string | null
          organization_id: string
          priority?: string
          resolved_at?: string | null
          scheduled_at?: string | null
          session_preference?: string
          status?: string
          subject: string
          ticket_number?: string
          updated_at?: string
        }
        Update: {
          ai_duplicate_of?: string | null
          ai_suggested_category?: string | null
          ai_suggested_priority?: string | null
          ai_summary?: string | null
          allow_recording?: boolean
          allow_remote_control?: boolean
          allow_view?: boolean
          allow_voice?: boolean
          assigned_agent_user_id?: string | null
          assigned_at?: string | null
          branch_id?: string | null
          category?: string
          closed_at?: string | null
          context?: Json
          created_at?: string
          created_by_member_id?: string | null
          created_by_user_id?: string | null
          description?: string
          first_response_at?: string | null
          id?: string
          legacy_case_id?: string | null
          organization_id?: string
          priority?: string
          resolved_at?: string | null
          scheduled_at?: string | null
          session_preference?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_ai_duplicate_of_fkey"
            columns: ["ai_duplicate_of"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_member_id_fkey"
            columns: ["created_by_member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_member_id_fkey"
            columns: ["created_by_member_id"]
            isOneToOne: false
            referencedRelation: "platform_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      platform_staff: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          last_login_at: string | null
          organization_id: string | null
          role: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_backfill_status: {
        Row: {
          missing_organization: number | null
          table_name: string | null
          total_rows: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_create_customer_success_case: {
        Args: { target_member_id: string; target_organization_id: string }
        Returns: boolean
      }
      can_manage_support_for_organization: {
        Args: { target_organization_id: string }
        Returns: boolean
      }
      cashier_activate_registration: {
        Args: { _coupon_id: string; _request_id: string; _start_date: string }
        Returns: string
      }
      cashier_reject_registration: {
        Args: { _request_id: string }
        Returns: boolean
      }
      current_user_branch: { Args: never; Returns: string }
      current_user_organization_ids: { Args: never; Returns: string[] }
      default_organization_id: { Args: never; Returns: string }
      delete_branch_safe: {
        Args: { _branch_id: string; _force?: boolean }
        Returns: Json
      }
      get_my_organizations: {
        Args: never
        Returns: {
          member_role: string
          member_status: string
          organization_code: string
          organization_id: string
          organization_name_ar: string
          organization_name_en: string
          organization_slug: string
          organization_status: string
        }[]
      }
      get_my_platform_profile: {
        Args: never
        Returns: {
          email: string
          full_name: string
          platform_member_id: string
          platform_role: Database["public"]["Enums"]["platform_role"]
          user_status: string
        }[]
      }
      has_organization_role: {
        Args: { requested_organization_id: string; requested_roles: string[] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_company_case_member: {
        Args: { target_case_id: string }
        Returns: boolean
      }
      is_organization_member: {
        Args: { requested_organization_id: string }
        Returns: boolean
      }
      is_platform_user: {
        Args: {
          required_roles?: Database["public"]["Enums"]["platform_role"][]
        }
        Returns: boolean
      }
      is_support_agent: { Args: never; Returns: boolean }
      is_support_manager: { Args: never; Returns: boolean }
      is_valid_platform_case_assignee: {
        Args: { target_member_id: string }
        Returns: boolean
      }
      next_customer_success_case_number: { Args: never; Returns: string }
      next_ticket_number: { Args: never; Returns: string }
      platform_organization_id: { Args: never; Returns: string }
      resolve_login_organization: {
        Args: { login_identifier: string }
        Returns: {
          organization_code: string
          organization_id: string
          organization_name_ar: string
          organization_name_en: string
          organization_slug: string
          organization_status: string
        }[]
      }
      scan_device_state: {
        Args: { _branch_id: string; _device_token: string }
        Returns: Json
      }
      scan_lookup: {
        Args: { _branch_id: string; _phone: string }
        Returns: Json
      }
      scan_order_status: { Args: { _order_id: string }; Returns: string }
      scan_register_request: {
        Args: {
          _branch_id: string
          _device_token: string
          _first_name: string
          _last_name: string
          _phone: string
          _preferred_language: string
          _user_agent: string
        }
        Returns: string
      }
      scan_registration_status: {
        Args: { _branch_id: string; _device_token: string; _phone: string }
        Returns: Json
      }
      scan_submit_order: {
        Args: {
          _branch_id: string
          _customer_note?: string
          _drink_type_id: string
          _phone: string
          _selected_option_ids?: string[]
        }
        Returns: string
      }
      shares_organization_with: {
        Args: { target_user: string }
        Returns: boolean
      }
      support_agent_level: { Args: never; Returns: string }
      touch_member_login: { Args: never; Returns: undefined }
      verify_organization_login: {
        Args: { requested_organization_id: string }
        Returns: {
          member_role: string
          member_status: string
          membership_id: string
          organization_code: string
          organization_id: string
          organization_name_ar: string
          organization_name_en: string
          organization_slug: string
          organization_status: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "cashier"
      coupon_status: "available" | "sold" | "expired"
      order_status: "pending" | "approved" | "rejected"
      platform_role:
        | "platform_owner"
        | "platform_admin"
        | "support_level_1"
        | "support_level_2"
        | "support_level_3"
      registration_status: "pending" | "approved" | "rejected"
      subscription_status: "active" | "expired" | "cancelled"
      support_priority: "normal" | "high" | "urgent"
      support_request_status:
        | "pending"
        | "accepted"
        | "declined"
        | "reschedule_proposed"
        | "scheduled"
        | "active"
        | "completed"
        | "cancelled"
        | "expired"
      support_request_type: "support" | "training"
      support_session_mode: "view" | "assist" | "edit"
      support_session_status:
        | "waiting"
        | "active"
        | "completed"
        | "cancelled"
        | "expired"
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
      app_role: ["admin", "cashier"],
      coupon_status: ["available", "sold", "expired"],
      order_status: ["pending", "approved", "rejected"],
      platform_role: [
        "platform_owner",
        "platform_admin",
        "support_level_1",
        "support_level_2",
        "support_level_3",
      ],
      registration_status: ["pending", "approved", "rejected"],
      subscription_status: ["active", "expired", "cancelled"],
      support_priority: ["normal", "high", "urgent"],
      support_request_status: [
        "pending",
        "accepted",
        "declined",
        "reschedule_proposed",
        "scheduled",
        "active",
        "completed",
        "cancelled",
        "expired",
      ],
      support_request_type: ["support", "training"],
      support_session_mode: ["view", "assist", "edit"],
      support_session_status: [
        "waiting",
        "active",
        "completed",
        "cancelled",
        "expired",
      ],
    },
  },
} as const
