import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from 'antd';

import ErrorPage from '../components/core/extra/ErrorPage';
import Home from './Home';

const { Content } = Layout;

const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <ErrorPage status="404" />,
    element: (
      <Layout className="app-shell min-h-[100vh]">
        <Content>
          <Home />
        </Content>
      </Layout>
    )
  }
]);

const Index = () => <RouterProvider router={router} />;

export default Index;
