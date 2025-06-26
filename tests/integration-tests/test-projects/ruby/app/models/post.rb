class Post < ApplicationRecord
  belongs_to :user
  belongs_to :category, optional: true
  
  has_many :comments, dependent: :destroy
  has_many :likes, dependent: :destroy
  has_many :liking_users, through: :likes, source: :user
  
  has_many_attached :images
  
  validates :title, presence: true, length: { minimum: 5, maximum: 100 }
  validates :content, presence: true, length: { minimum: 10, maximum: 10000 }
  validates :slug, uniqueness: true, allow_blank: true
  
  scope :published, -> { where(published: true) }
  scope :draft, -> { where(published: false) }
  scope :recent, -> { order(created_at: :desc) }
  scope :popular, -> { order(likes_count: :desc) }
  scope :featured, -> { where(featured: true) }
  
  before_save :generate_slug, if: -> { slug.blank? && title.present? }
  before_create :set_default_values
  
  def to_param
    slug
  end
  
  def liked_by?(user)
    likes.exists?(user_id: user.id)
  end
  
  def reading_time
    words_per_minute = 200
    text = ActionController::Base.helpers.strip_tags(content)
    words = text.scan(/\w+/).size
    (words / words_per_minute.to_f).ceil
  end
  
  private
  
  def generate_slug
    self.slug = title.parameterize
  end
  
  def set_default_values
    self.published = false if published.nil?
    self.featured = false if featured.nil?
    self.likes_count = 0 if likes_count.nil?
    self.comments_count = 0 if comments_count.nil?
  end
end