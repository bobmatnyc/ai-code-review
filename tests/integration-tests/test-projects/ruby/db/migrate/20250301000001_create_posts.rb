class CreatePosts < ActiveRecord::Migration[7.1]
  def change
    create_table :posts do |t|
      t.string :title, null: false
      t.text :content, null: false
      t.string :slug
      t.boolean :published, default: false
      t.boolean :featured, default: false
      t.integer :likes_count, default: 0
      t.integer :comments_count, default: 0
      t.integer :views_count, default: 0
      t.references :user, null: false, foreign_key: true
      t.references :category, foreign_key: true

      t.timestamps
    end

    add_index :posts, :slug, unique: true
    add_index :posts, :published
  end
end
