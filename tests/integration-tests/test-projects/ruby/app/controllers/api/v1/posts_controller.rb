module Api
  module V1
    class PostsController < Api::V1::BaseController
      before_action :authenticate_user!, except: [:index, :show]
      before_action :set_post, only: [:show, :update, :destroy]
      before_action :authorize_post, only: [:update, :destroy]
      
      def index
        @posts = Post.published.recent.includes(:user, :category)
        
        if params[:category].present?
          @posts = @posts.where(category_id: params[:category])
        end
        
        if params[:user_id].present?
          @posts = @posts.where(user_id: params[:user_id])
        end
        
        # Add pagination
        @posts = @posts.page(params[:page]).per(20)
        
        render json: {
          posts: @posts.as_json(include: [:user, :category]),
          meta: {
            current_page: @posts.current_page,
            total_pages: @posts.total_pages,
            total_count: @posts.total_count
          }
        }
      end
      
      def show
        render json: @post.as_json(
          include: [
            :user, 
            :category,
            comments: { include: :user }
          ]
        )
      end
      
      def create
        @post = current_user.posts.build(post_params)
        
        if @post.save
          render json: @post, status: :created
        else
          render json: { errors: @post.errors.full_messages }, status: :unprocessable_entity
        end
      end
      
      def update
        if @post.update(post_params)
          render json: @post
        else
          render json: { errors: @post.errors.full_messages }, status: :unprocessable_entity
        end
      end
      
      def destroy
        @post.destroy
        head :no_content
      end
      
      private
      
      def set_post
        @post = Post.find_by!(slug: params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Post not found' }, status: :not_found
      end
      
      def authorize_post
        unless @post.user == current_user || current_user.admin?
          render json: { error: 'Unauthorized' }, status: :unauthorized
        end
      end
      
      def post_params
        params.require(:post).permit(:title, :content, :published, :category_id)
      end
    end
  end
end