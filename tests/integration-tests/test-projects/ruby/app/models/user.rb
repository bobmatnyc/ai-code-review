class User < ApplicationRecord
  # Include default devise modules
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :confirmable, :lockable, :timeoutable, :trackable

  has_many :posts, dependent: :destroy
  has_many :comments, dependent: :destroy
  has_many :likes, dependent: :destroy
  has_many :liked_posts, through: :likes, source: :post

  has_one_attached :avatar

  enum role: { user: 0, moderator: 1, admin: 2 }

  validates :username, presence: true, uniqueness: true,
                      length: { minimum: 3, maximum: 20 },
                      format: { with: /\A[a-zA-Z0-9_]+\z/ }
  validates :email, presence: true, uniqueness: true
  validates :bio, length: { maximum: 500 }

  scope :active, -> { where(active: true) }
  scope :admins, -> { where(role: :admin) }
  scope :created_this_month, -> { where(created_at: Time.current.beginning_of_month..Time.current.end_of_month) }

  before_save :downcase_email

  def full_name
    "#{first_name} #{last_name}".strip
  end

  def admin?
    role == "admin"
  end

  def moderator?
    role == "moderator"
  end

  def active_for_authentication?
    super && active?
  end

  private

  def downcase_email
    self.email = email.downcase
  end
end
