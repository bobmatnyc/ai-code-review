class PostsController < ApplicationController
  before_action :authenticate_user!, except: [:index, :show]
  before_action :set_post, only: [:show, :edit, :update, :destroy, :like, :unlike]
  before_action :authorize_post, only: [:edit, :update, :destroy]
  
  def index
    @posts = Post.published.recent.includes(:user, :category)
    
    if params[:category].present?
      @category = Category.find_by(slug: params[:category])
      @posts = @posts.where(category: @category) if @category
    end
    
    if params[:tag].present?
      @posts = @posts.joins(:tags).where(tags: { name: params[:tag] })
    end
    
    # Add pagination
    @posts = @posts.page(params[:page]).per(10)
    
    respond_to do |format|
      format.html
      format.json { render json: @posts }
    end
  end
  
  def show
    @comments = @post.comments.includes(:user).order(created_at: :desc)
    @comment = Comment.new
    
    # Track view count
    @post.increment!(:views_count)
  end
  
  def new
    @post = Post.new
  end
  
  def create
    @post = current_user.posts.build(post_params)
    
    if @post.save
      redirect_to @post, notice: 'Post was successfully created.'
    else
      render :new
    end
  end
  
  def edit
  end
  
  def update
    if @post.update(post_params)
      redirect_to @post, notice: 'Post was successfully updated.'
    else
      render :edit
    end
  end
  
  def destroy
    @post.destroy
    redirect_to posts_path, notice: 'Post was successfully deleted.'
  end
  
  def like
    if @post.liked_by?(current_user)
      redirect_to @post, alert: 'You already liked this post.'
    else
      @post.likes.create(user: current_user)
      @post.increment!(:likes_count)
      redirect_to @post, notice: 'You liked this post.'
    end
  end
  
  def unlike
    like = @post.likes.find_by(user: current_user)
    
    if like
      like.destroy
      @post.decrement!(:likes_count)
      redirect_to @post, notice: 'You unliked this post.'
    else
      redirect_to @post, alert: 'You have not liked this post.'
    end
  end
  
  private
  
  def set_post
    @post = Post.find_by!(slug: params[:id])
  rescue ActiveRecord::RecordNotFound
    redirect_to posts_path, alert: 'Post not found.'
  end
  
  def authorize_post
    authorize @post
  end
  
  def post_params
    params.require(:post).permit(:title, :content, :published, :category_id, 
                                :featured, :cover_image, images: [])
  end
end