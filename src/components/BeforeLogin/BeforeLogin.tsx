import { useAuth } from '@/hook/useAuth';
import { type User } from '@/context/Auth/AuthContext';
import { useRef } from 'react';
import { Button, Card, Center, Checkbox, Field, Input, Link, Popover, Portal, Stack, Text } from '@chakra-ui/react';
import { PasswordInput } from '@/components/ui/password-input';

import { signInWithRedirect, GoogleAuthProvider } from "firebase/auth";
import { firebaseAuth } from '@/context/FirebaseUser/firebase';
import { SignInWithGoogle } from '@/components/ui/SignInWithGoogle';

export const BeforeLogin = () => {
  const auth = useAuth()

  const idRef = useRef<HTMLInputElement | null>(null);
  const passRef = useRef<HTMLInputElement | null>(null);
  const saveRef = useRef<HTMLInputElement | null>(null);

  const provider = new GoogleAuthProvider();

  return (
    <Center h='100vh'>
      <Stack>
        <Card.Root maxW='sm' mx={4}>
          <Card.Header>
            <Card.Title>ログイン</Card.Title>
            <Card.Description>
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <Stack gap='4' w='full'>
              <Field.Root>
                <Field.Label>MNS Account ID</Field.Label>
                <Input ref={idRef} />
              </Field.Root>
              <Field.Root>
                <Field.Label>パスワード</Field.Label>
                <PasswordInput ref={passRef} />
              </Field.Root>
              <Checkbox.Root defaultChecked>
                <Checkbox.HiddenInput ref={saveRef} />
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Label>認証情報をブラウザに保存する</Checkbox.Label>
              </Checkbox.Root>
              <SignInWithGoogle onClick={() => {
                signInWithRedirect(firebaseAuth, provider)
              }} />
            </Stack>
          </Card.Body>
          <Card.Footer justifyContent='flex-end'>
            <Button variant='solid' onClick={() => {
              const user: User = {
                id: idRef.current!.value,
                pass: passRef.current!.value
              }

              auth.login(user, saveRef.current!.checked)
            }}>ログイン</Button>
          </Card.Footer>
        </Card.Root>
        <Center>
          <Popover.Root>
            <Popover.Trigger asChild>
              <Link textAlign="center" cursor="pointer">
                <Text color='gray.500'>
                  Continue with Google について
                </Text>
              </Link>
            </Popover.Trigger>
            <Portal>
              <Popover.Positioner>
                <Popover.Content>
                  <Popover.Arrow />
                  <Popover.Body>
                    <Text textStyle="sm" color="fg.muted">
                      アップデートにより、Googleアカウントを用いて認証情報を暗号化し、保護できるようになりました。XSS攻撃を防ぐため、こちらの機能の利用を推奨します。
                    </Text>
                  </Popover.Body>
                </Popover.Content>
              </Popover.Positioner>
            </Portal>
          </Popover.Root>
        </Center>
      </Stack>
    </Center>
  );
};
